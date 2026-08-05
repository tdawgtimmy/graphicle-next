"""Recompute node topology and write it to `node_metrics`.

Run after ingesting or changing graph data:

    nx run @graphicle/api:recompute-metrics

Betweenness is O(V*E); pass --skip-betweenness on large graphs or frequent runs.
"""

import argparse
import asyncio

from graphicle_api.db.session import dispose_engine, get_engine
from graphicle_api.services.analysis import compute_metrics
from graphicle_api.services.store import load_whole_graph, write_metrics


async def run(*, include_betweenness: bool, directed: bool) -> int:
    engine = get_engine()
    try:
        async with engine.begin() as connection:
            node_ids, edge_list = await load_whole_graph(connection)
            if not node_ids:
                print("no nodes; nothing to compute")
                return 0

            metrics = compute_metrics(
                node_ids,
                edge_list,
                directed=directed,
                include_betweenness=include_betweenness,
            )
            written = await write_metrics(connection, metrics)

        print(f"computed metrics for {written} nodes over {len(edge_list)} edges")
        return 0
    finally:
        await dispose_engine()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--skip-betweenness",
        action="store_true",
        help="Skip the O(V*E) measure; the rest still get computed.",
    )
    parser.add_argument(
        "--undirected",
        action="store_true",
        help="Treat edges as undirected when computing degree and PageRank.",
    )
    args = parser.parse_args()

    return asyncio.run(
        run(
            include_betweenness=not args.skip_betweenness,
            directed=not args.undirected,
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())
