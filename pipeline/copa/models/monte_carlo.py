"""Simulação Monte Carlo do torneio.

Roda o torneio inteiro N vezes (default 100.000) e conta com que frequência
cada seleção alcança cada fase. As frequências viram probabilidades.

Tudo é vetorizado em numpy: simulamos as N réplicas de cada jogo de uma vez,
o que torna 100k simulações uma questão de segundos, não minutos.

Formato Copa 2026 suportado de forma genérica:
  - G grupos de 4 → 2 classificados por grupo (+ melhores terceiros, se preciso,
    para completar uma chave de potência de 2).
  - Mata-mata simples até a final.

NOTA (simplificação de MVP): quando há terceiros colocados completando a chave,
o chaveamento usa um seeding aproximado (não o template oficial da FIFA). Para
2/4/8 grupos (sem terceiros) o cruzamento é o padrão correto. Refinar com o
template oficial é um TODO pós-MVP.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from copa import config
from copa.models import elo as elo_model

STAGE_BY_SIZE: dict[int, str] = {
    32: "round_of_32",
    16: "round_of_16",
    8: "quarter",
    4: "semi",
    2: "final",
}
KNOCKOUT_STAGES: tuple[str, ...] = ("round_of_16", "quarter", "semi", "final")


@dataclass
class SimulationResult:
    """Saída bruta da simulação — contagens, não probabilidades ainda."""

    team_ids: list[str]
    n_sims: int
    elo: np.ndarray                      # (T,)
    qualified: np.ndarray                # (T,) — quantas vezes passou do grupo
    reach: dict[str, np.ndarray]         # stage -> (T,) entrou nesta fase
    champion: np.ndarray                 # (T,)
    opponents: dict[str, np.ndarray]     # stage -> (T, T) confrontos

    def _idx(self, team_id: str) -> int:
        return self.team_ids.index(team_id)

    def prob_advance_group(self, team_id: str) -> float:
        return float(self.qualified[self._idx(team_id)] / self.n_sims)

    def prob_reach(self, team_id: str, stage: str, advance_group: float) -> float:
        """Probabilidade de alcançar uma fase do mata-mata.

        Se a fase não existe (chave menor que o nome pediria), o time que
        passou do grupo a 'venceu' por bye → usa a prob. de classificação.
        """
        t = self._idx(team_id)
        if stage in self.reach:
            return float(self.reach[stage][t] / self.n_sims)
        return advance_group

    def prob_champion(self, team_id: str) -> float:
        return float(self.champion[self._idx(team_id)] / self.n_sims)


def _next_power_of_two(n: int) -> int:
    p = 1
    while p < n:
        p *= 2
    return p


def simulate(
    teams: list[dict],
    matches: list[dict],
    n_sims: int = config.SIMULATIONS,
    seed: int | None = config.RANDOM_SEED,
) -> SimulationResult:
    rng = np.random.default_rng(seed)

    team_ids = [t["id"] for t in teams]
    idx_of = {tid: i for i, tid in enumerate(team_ids)}
    n_teams = len(team_ids)
    elo = np.array([float(t["elo"]) for t in teams])

    # Grupos: id -> índices globais dos membros.
    groups: dict[str, list[int]] = {}
    for t in teams:
        groups.setdefault(t["group"], []).append(idx_of[t["id"]])
    group_ids = sorted(groups.keys())

    qualified = np.zeros(n_teams, dtype=np.int64)
    winners = np.zeros((n_sims, len(group_ids)), dtype=np.int64)   # global idx
    runners = np.zeros((n_sims, len(group_ids)), dtype=np.int64)
    third_global = np.zeros((n_sims, len(group_ids)), dtype=np.int64)
    third_score = np.zeros((n_sims, len(group_ids)))

    # ── Fase de grupos ────────────────────────────────────────
    for gi, gid in enumerate(group_ids):
        members = groups[gid]
        size = len(members)
        local_of = {g: l for l, g in enumerate(members)}
        members_arr = np.array(members)

        base_pts = np.zeros(size)
        base_gd = np.zeros(size)
        base_gf = np.zeros(size)

        remaining: list[tuple[int, int]] = []
        for m in matches:
            if m.get("group") != gid or m["stage"] != "group":
                continue
            h, a = idx_of[m["homeId"]], idx_of[m["awayId"]]
            if m["status"] == "finished":
                gh, ga = int(m["homeScore"]), int(m["awayScore"])
                hl, al = local_of[h], local_of[a]
                base_gf[hl] += gh; base_gf[al] += ga
                base_gd[hl] += gh - ga; base_gd[al] += ga - gh
                if gh > ga:
                    base_pts[hl] += 3
                elif gh < ga:
                    base_pts[al] += 3
                else:
                    base_pts[hl] += 1; base_pts[al] += 1
            else:
                remaining.append((h, a))

        pts = np.tile(base_pts, (n_sims, 1))
        gd = np.tile(base_gd, (n_sims, 1))
        gf = np.tile(base_gf, (n_sims, 1))

        for h, a in remaining:
            lam_h, lam_a = elo_model.expected_goals(elo[h], elo[a])
            gh = rng.poisson(lam_h, n_sims)
            ga = rng.poisson(lam_a, n_sims)
            hl, al = local_of[h], local_of[a]
            home_win = gh > ga
            away_win = gh < ga
            draw = ~(home_win | away_win)
            pts[:, hl] += np.where(home_win, 3, np.where(draw, 1, 0))
            pts[:, al] += np.where(away_win, 3, np.where(draw, 1, 0))
            gd[:, hl] += gh - ga; gd[:, al] += ga - gh
            gf[:, hl] += gh; gf[:, al] += ga

        # Score de desempate: pontos >> saldo >> gols pró >> ruído aleatório.
        noise = rng.random((n_sims, size))
        score = pts * 1e9 + (gd + 500) * 1e4 + gf * 1e1 + noise
        order = np.argsort(-score, axis=1)  # melhores primeiro (local idx)

        win_local = order[:, 0]
        run_local = order[:, 1]
        winners[:, gi] = members_arr[win_local]
        runners[:, gi] = members_arr[run_local]
        np.add.at(qualified, members_arr[win_local], 1)
        np.add.at(qualified, members_arr[run_local], 1)

        if size >= 3:
            thi_local = order[:, 2]
            third_global[:, gi] = members_arr[thi_local]
            third_score[:, gi] = np.take_along_axis(score, thi_local[:, None], axis=1)[:, 0]

    # ── Montagem da chave ─────────────────────────────────────
    n_groups = len(group_ids)
    base_q = 2 * n_groups
    bracket_size = _next_power_of_two(base_q)
    needed_thirds = bracket_size - base_q

    if needed_thirds == 0:
        # Cruzamento padrão: vencedor[g] x vice[(g+1)%G] (evita mesmo grupo na 1ª fase).
        cols = []
        for g in range(n_groups):
            cols.append(winners[:, g])
            cols.append(runners[:, (g + 1) % n_groups])
        bracket = np.stack(cols, axis=1)
    else:
        # Fallback de MVP: melhores terceiros completam a chave (seeding aproximado).
        order_thirds = np.argsort(-third_score, axis=1)[:, :needed_thirds]
        chosen_thirds = np.take_along_axis(third_global, order_thirds, axis=1)
        np.add.at(qualified, chosen_thirds.flatten(), 1)
        bracket = np.concatenate(
            [winners, chosen_thirds, runners[:, ::-1]], axis=1
        )

    # ── Mata-mata ─────────────────────────────────────────────
    # Matriz de avanço: adv[i, j] = P(i passa por j) num jogo único.
    # Pré-computada (depende só do par de Elos) p/ lookup vetorizado e exato.
    adv = np.full((n_teams, n_teams), 0.5)
    for i in range(n_teams):
        for j in range(n_teams):
            if i != j:
                adv[i, j] = elo_model.advance_probability(elo[i], elo[j])

    reach: dict[str, np.ndarray] = {}
    opponents: dict[str, np.ndarray] = {}
    champion = np.zeros(n_teams, dtype=np.int64)

    current = bracket
    size = bracket_size
    # Registra quem ENTROU na primeira fase do mata-mata.
    if size in STAGE_BY_SIZE:
        reach[STAGE_BY_SIZE[size]] = np.bincount(current.flatten(), minlength=n_teams)

    while size > 1:
        pairs = current.reshape(n_sims, size // 2, 2)
        a = pairs[:, :, 0]
        b = pairs[:, :, 1]
        p_a = adv[a, b]
        a_wins = rng.random((n_sims, size // 2)) < p_a
        win = np.where(a_wins, a, b)

        # Confrontos desta fase (simétrico).
        opp = np.zeros((n_teams, n_teams), dtype=np.int64)
        np.add.at(opp, (a.flatten(), b.flatten()), 1)
        np.add.at(opp, (b.flatten(), a.flatten()), 1)
        opponents[STAGE_BY_SIZE[size]] = opp

        current = win
        size //= 2
        if size == 1:
            np.add.at(champion, current.flatten(), 1)
        elif size in STAGE_BY_SIZE:
            reach[STAGE_BY_SIZE[size]] = np.bincount(current.flatten(), minlength=n_teams)

    return SimulationResult(
        team_ids=team_ids,
        n_sims=n_sims,
        elo=elo,
        qualified=qualified,
        reach=reach,
        champion=champion,
        opponents=opponents,
    )
