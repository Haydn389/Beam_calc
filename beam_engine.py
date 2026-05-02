"""
Direct Stiffness Method (FEM) Beam Solver
==========================================
Euler-Bernoulli beam theory.
2 DOF per node: v (transverse displacement), θ (rotation)

Sign convention (standard structural engineering):
  Positive V  : net upward force to the LEFT of the cross-section
  Positive M  : sagging  (bottom fibre in tension)
  Positive δ  : upward displacement
"""
from __future__ import annotations

import numpy as np
from dataclasses import dataclass, field
from typing import Any, Dict, List, Tuple


# ─────────────────────────────────────────────────────────────────────────────
# Data Model
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class BeamModel:
    """Input model for the beam solver."""
    length:     float
    E:          float                        # Young's modulus
    I:          float                        # Second moment of area
    supports:   List[Dict[str, Any]]         # [{"x": 0, "type": "fixed"}, ...]
    loads:      List[Dict[str, Any]]         # see API contract
    n_elements: int = field(default=200)


# ─────────────────────────────────────────────────────────────────────────────
# Solver
# ─────────────────────────────────────────────────────────────────────────────

class DirectStiffnessSolver:
    """
    Euler-Bernoulli beam FEM solver.

    Supported support types : "fixed" | "pinned" | "roller"
    Supported load types    : "point" | "distributed" | "varying"
                              ("distributed" = uniform,  "varying" = trapezoidal)
    """

    # ── Construction ─────────────────────────────────────────────────────────

    def __init__(self, model: BeamModel) -> None:
        self.model   = model
        self.EI      = model.E * model.I
        self.L       = model.length
        self.x_nodes = self._build_mesh()
        self.n_nodes = len(self.x_nodes)
        self.n_elem  = self.n_nodes - 1
        self.n_dof   = 2 * self.n_nodes

    # ── Mesh ─────────────────────────────────────────────────────────────────

    def _build_mesh(self) -> np.ndarray:
        """
        Build a mesh that places nodes exactly at every support,
        point-load position, and distributed-load boundary so the
        FEM solution is exact at those critical points.
        """
        pts: set[float] = {0.0, self.L}

        for s in self.model.supports:
            x = float(s["x"])
            if 0.0 <= x <= self.L:
                pts.add(x)

        for load in self.model.loads:
            t = load["type"]
            if t == "point":
                x = float(load["x"])
                if 0.0 <= x <= self.L:
                    pts.add(x)
            elif t in ("distributed", "varying"):
                x1 = float(load.get("start_x", 0.0))
                x2 = float(load.get("end_x",   self.L))
                pts.add(max(0.0, min(self.L, x1)))
                pts.add(max(0.0, min(self.L, x2)))

        # Uniform base mesh fills gaps with fine elements
        pts.update(np.linspace(0.0, self.L, self.model.n_elements + 1).tolist())

        return np.array(sorted(pts))

    # ── Element stiffness ────────────────────────────────────────────────────

    @staticmethod
    def _ke(EI: float, le: float) -> np.ndarray:
        """4 × 4 Euler-Bernoulli beam element stiffness matrix.
        DOF order: [v_i, θ_i, v_j, θ_j]
        """
        c = EI / le ** 3
        return c * np.array([
            [ 12,       6 * le,    -12,       6 * le  ],
            [  6 * le,  4 * le**2,  -6 * le,  2 * le**2],
            [-12,      -6 * le,     12,      -6 * le  ],
            [  6 * le,  2 * le**2,  -6 * le,  4 * le**2],
        ])

    # ── Global stiffness assembly ────────────────────────────────────────────

    def _assemble_K(self) -> np.ndarray:
        K = np.zeros((self.n_dof, self.n_dof))
        for e in range(self.n_elem):
            le  = self.x_nodes[e + 1] - self.x_nodes[e]
            ke  = self._ke(self.EI, le)
            d   = [2*e, 2*e+1, 2*e+2, 2*e+3]
            K[np.ix_(d, d)] += ke
        return K

    # ── Equivalent nodal forces for partial distributed load ─────────────────

    @staticmethod
    def _gauss5() -> Tuple[np.ndarray, np.ndarray]:
        """5-point Gauss-Legendre quadrature on [-1, 1]."""
        pts = np.array([-0.90617985, -0.53846931, 0.0,
                         0.53846931,  0.90617985])
        wts = np.array([ 0.23692689,  0.47862867, 0.56888889,
                          0.47862867,  0.23692689])
        return pts, wts

    def _nodal_forces_partial_dist(
        self,
        w1: float, w2: float,   # load intensity at left and right of the partial region
        a:  float,               # left offset inside element (local coord)
        c:  float,               # length of the partial region
        le: float,               # full element length
    ) -> np.ndarray:
        """
        Equivalent nodal forces [Fy_i, Mz_i, Fy_j, Mz_j] for a
        trapezoidal distributed load w(x) acting from x=a to x=a+c
        within an element of length le.  Uses 5-point Gauss quadrature.
        """
        if c < 1e-14:
            return np.zeros(4)

        gp, gw = self._gauss5()
        # Map Gauss points from [-1,1] → [a, a+c]
        xi = a + 0.5 * c * (gp + 1.0)
        w  = w1 + (xi - a) / c * (w2 - w1) if c > 1e-14 else np.full(5, w1)
        jac = 0.5 * c

        F = np.zeros(4)
        for xg, wg, wt in zip(xi, w, gw):
            s = xg / le                        # normalised coord [0, 1]
            N = np.array([
                1 - 3*s**2 + 2*s**3,
                le * (s  - 2*s**2 + s**3),
                3*s**2 - 2*s**3,
                le * (-s**2 + s**3),
            ])
            F += N * wg * wt * jac

        return F

    # ── Global load vector assembly ──────────────────────────────────────────

    def _assemble_F(self) -> np.ndarray:
        F = np.zeros(self.n_dof)

        for load in self.model.loads:
            t = load["type"]

            # ── Point load / moment ──────────────────────────────────────────
            if t == "point":
                x  = float(load["x"])
                fy = float(load.get("fy", 0.0))
                mz = float(load.get("mz", 0.0))
                idx = int(np.argmin(np.abs(self.x_nodes - x)))
                F[2*idx]     += fy
                F[2*idx + 1] += mz

            # ── Distributed / varying load ───────────────────────────────────
            elif t in ("distributed", "varying"):
                x1  = float(load.get("start_x", 0.0))
                x2  = float(load.get("end_x",   self.L))
                wy1 = float(load.get("wy", load.get("wy_start", 0.0)))
                wy2 = float(load.get("wy_end", wy1))

                x1 = max(0.0, x1)
                x2 = min(self.L, x2)
                if x2 <= x1:
                    continue
                load_span = x2 - x1

                for e in range(self.n_elem):
                    xe1 = self.x_nodes[e]
                    xe2 = self.x_nodes[e + 1]
                    le  = xe2 - xe1

                    # Intersection of load region with this element
                    ix1 = max(xe1, x1)
                    ix2 = min(xe2, x2)
                    if ix2 <= ix1:
                        continue

                    t1  = (ix1 - x1) / load_span
                    t2  = (ix2 - x1) / load_span
                    wi1 = wy1 + t1 * (wy2 - wy1)
                    wi2 = wy1 + t2 * (wy2 - wy1)
                    a   = ix1 - xe1          # left offset within element
                    c   = ix2 - ix1          # partial load length

                    fe = self._nodal_forces_partial_dist(wi1, wi2, a, c, le)
                    d  = [2*e, 2*e+1, 2*e+2, 2*e+3]
                    for i, gi in enumerate(d):
                        F[gi] += fe[i]

        return F

    # ── Boundary conditions ──────────────────────────────────────────────────

    def _constrained_dofs(self) -> List[int]:
        cdofs: set[int] = set()
        for s in self.model.supports:
            x     = float(s["x"])
            stype = s["type"]
            idx   = int(np.argmin(np.abs(self.x_nodes - x)))
            if stype == "free":
                continue                     # no constraint at all
            if stype in ("fixed", "pinned", "roller"):
                cdofs.add(2 * idx)          # v = 0
            if stype == "fixed":
                cdofs.add(2 * idx + 1)      # θ = 0
        return sorted(cdofs)

    # ── Solve ────────────────────────────────────────────────────────────────

    def _solve(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Solve K·u = F.
        Returns (u, K, F) so reactions can be recovered as K·u − F.
        """
        K = self._assemble_K()
        F = self._assemble_F()

        cdofs = self._constrained_dofs()
        fdofs = [i for i in range(self.n_dof) if i not in set(cdofs)]

        Kff = K[np.ix_(fdofs, fdofs)]
        Ff  = F[fdofs]

        u_free = np.linalg.solve(Kff, Ff)

        u = np.zeros(self.n_dof)
        for i, d in enumerate(fdofs):
            u[d] = u_free[i]

        return u, K, F

    # ── Post-processing: evaluation grid ────────────────────────────────────

    def _build_eval_grid(self) -> np.ndarray:
        """
        Dense evaluation grid that always includes the critical x positions.
        Adds x−ε and x+ε around point loads / supports so shear jumps
        are clearly visible in the output data.
        """
        n_base = max(600, self.n_elem * 5)
        pts    = list(np.linspace(0.0, self.L, n_base))
        eps    = 1e-6 * self.L

        for load in self.model.loads:
            if load["type"] == "point":
                x = float(load["x"])
                pts += [x - eps, x, x + eps]
            elif load["type"] in ("distributed", "varying"):
                for key in ("start_x", "end_x"):
                    xb = float(load.get(key, 0.0 if key == "start_x" else self.L))
                    pts += [xb - eps, xb, xb + eps]

        for s in self.model.supports:
            x = float(s["x"])
            pts += [x - eps, x, x + eps]

        arr = np.array([p for p in pts if 0.0 <= p <= self.L])
        return np.unique(arr)

    # ── Post-processing: deflection via Hermite interpolation ────────────────

    def _deflection(self, u: np.ndarray, x_eval: np.ndarray) -> np.ndarray:
        """Interpolate the FEM displacement field at arbitrary x positions."""
        delta = np.zeros(len(x_eval))
        for i, x in enumerate(x_eval):
            e  = int(np.searchsorted(self.x_nodes, x, side="right")) - 1
            e  = np.clip(e, 0, self.n_elem - 1)
            xe1 = self.x_nodes[e]
            le  = self.x_nodes[e + 1] - xe1
            s   = np.clip((x - xe1) / le, 0.0, 1.0)
            ue  = u[[2*e, 2*e+1, 2*e+2, 2*e+3]]
            N   = np.array([
                1 - 3*s**2 + 2*s**3,
                le * (s  - 2*s**2 + s**3),
                3*s**2 - 2*s**3,
                le * (-s**2 + s**3),
            ])
            delta[i] = N @ ue
        return delta

    # ── Post-processing: V and M by direct integration ───────────────────────

    def _shear_moment(
        self,
        K: np.ndarray,
        F: np.ndarray,
        u: np.ndarray,
        x_eval: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Compute V(x) and M(x) by integrating all external forces
        from the left edge of the beam to x.

        Using direct integration avoids the piecewise-constant-shear
        artefact that comes from differentiating the cubic displacement
        field.  This gives accurate, smooth V/M diagrams.

        Inclusion convention: forces AT x are included (gives V(x⁺)).
        This ensures the correct value just after a concentrated load,
        and the evaluation grid includes x−ε before each load so
        the jump discontinuity is explicitly captured.
        """
        # Nodal residuals = reaction forces the supports apply ON the beam
        R = K @ u - F

        # ── Collect all point forces / moments on the beam ────────────────
        pf: List[Tuple[float, float]] = []   # (x, fy) — upward positive
        pm: List[Tuple[float, float]] = []   # (x, mz) — CCW  positive

        for load in self.model.loads:
            if load["type"] == "point":
                xf = float(load["x"])
                fy = float(load.get("fy", 0.0))
                mz = float(load.get("mz", 0.0))
                pf.append((xf, fy))
                if abs(mz) > 1e-14:
                    pm.append((xf, mz))

        for s in self.model.supports:
            x_s  = float(s["x"])
            idx  = int(np.argmin(np.abs(self.x_nodes - x_s)))
            pf.append((x_s, float(R[2 * idx])))
            if s["type"] == "fixed":
                pm.append((x_s, float(R[2 * idx + 1])))

        # ── Distributed loads ─────────────────────────────────────────────
        dl: List[Tuple[float, float, float, float]] = []
        for load in self.model.loads:
            if load["type"] in ("distributed", "varying"):
                x1  = float(load.get("start_x", 0.0))
                x2  = float(load.get("end_x",   self.L))
                wy1 = float(load.get("wy", load.get("wy_start", 0.0)))
                wy2 = float(load.get("wy_end", wy1))
                dl.append((max(0.0, x1), min(self.L, x2), wy1, wy2))

        # ── 8-point Gauss-Legendre for distributed load integration ──────
        gp8, gw8 = np.polynomial.legendre.leggauss(8)

        V_arr = np.zeros(len(x_eval))
        M_arr = np.zeros(len(x_eval))

        for i, x in enumerate(x_eval):
            V = M = 0.0

            # Concentrated forces and moments at or to the left of x
            for xf, fy in pf:
                if xf < x + 1e-9:
                    V += fy
                    M += fy * (x - xf)
            for xm, mz in pm:
                if xm < x + 1e-9:
                    M += mz

            # Distributed load contribution
            for x1, x2, wy1, wy2 in dl:
                x_lo = x1
                x_hi = min(x2, x)
                if x_hi <= x_lo:
                    continue
                span = x2 - x1

                # Map Gauss points to [x_lo, x_hi]
                half = 0.5 * (x_hi - x_lo)
                mid  = 0.5 * (x_hi + x_lo)
                xi_g = mid + half * gp8
                wi_g = (wy1 + (xi_g - x1) / span * (wy2 - wy1)
                        if span > 1e-14 else np.full(8, wy1))

                V += float(np.dot(wi_g,            gw8) * half)
                M += float(np.dot(wi_g * (x - xi_g), gw8) * half)

            V_arr[i] = V
            M_arr[i] = M

        return V_arr, M_arr

    # ── Public API ───────────────────────────────────────────────────────────

    def run(self) -> Dict[str, Any]:
        """
        Solve the beam and return a result dictionary ready for the
        FastAPI response / frontend consumption.
        """
        u, K, F = self._solve()

        x_eval = self._build_eval_grid()
        delta  = self._deflection(u, x_eval)
        V, M   = self._shear_moment(K, F, u, x_eval)

        # ── Support reactions ─────────────────────────────────────────────
        R = K @ u - F
        reactions: Dict[str, Dict[str, float]] = {}
        for s in self.model.supports:
            x_s  = float(s["x"])
            idx  = int(np.argmin(np.abs(self.x_nodes - x_s)))
            reactions[str(x_s)] = {
                "Fy": float(R[2 * idx]),
                "Mz": float(R[2 * idx + 1]) if s["type"] == "fixed" else 0.0,
            }

        return {
            "x":              x_eval.tolist(),
            "V":              V.tolist(),
            "M":              M.tolist(),
            "delta":          delta.tolist(),
            "reactions":      reactions,
            "max_deflection": float(np.max(delta)),
            "min_deflection": float(np.min(delta)),
            "max_moment":     float(np.max(np.abs(M))),
            "max_shear":      float(np.max(np.abs(V))),
        }
