from uuid import UUID

from graphicle_api.services.analysis import compute_metrics


def node(n: int) -> UUID:
    return UUID(int=n)


# A star: node 0 at the centre, 1..4 as leaves. Degree is unambiguous here,
# which makes it a good check that "who has the most direct connections?"
# resolves to the centre.
STAR_CENTRE = node(0)
STAR_LEAVES = [node(1), node(2), node(3), node(4)]
STAR_NODES = [STAR_CENTRE, *STAR_LEAVES]
STAR_EDGES = [(STAR_CENTRE, leaf, 1.0) for leaf in STAR_LEAVES]


def test_returns_empty_for_no_nodes() -> None:
    assert compute_metrics([], []) == []


def test_degree_identifies_the_hub() -> None:
    metrics = {m.node_id: m for m in compute_metrics(STAR_NODES, STAR_EDGES)}

    assert metrics[STAR_CENTRE].degree == 4
    assert metrics[STAR_CENTRE].out_degree == 4
    assert metrics[STAR_CENTRE].in_degree == 0

    for leaf in STAR_LEAVES:
        assert metrics[leaf].degree == 1
        assert metrics[leaf].in_degree == 1

    ranked = sorted(compute_metrics(STAR_NODES, STAR_EDGES), key=lambda m: -m.degree)
    assert ranked[0].node_id == STAR_CENTRE


def test_betweenness_is_highest_at_the_hub() -> None:
    metrics = {m.node_id: m for m in compute_metrics(STAR_NODES, STAR_EDGES, directed=False)}

    assert metrics[STAR_CENTRE].betweenness is not None
    assert metrics[STAR_CENTRE].betweenness > 0
    assert all(metrics[leaf].betweenness == 0 for leaf in STAR_LEAVES)


def test_betweenness_can_be_skipped() -> None:
    metrics = compute_metrics(STAR_NODES, STAR_EDGES, include_betweenness=False)

    assert all(m.betweenness is None for m in metrics)
    # The cheap measures are still populated.
    assert all(m.pagerank is not None for m in metrics)


def test_isolated_nodes_get_their_own_community() -> None:
    isolated = [node(1), node(2), node(3)]
    metrics = compute_metrics(isolated, [])

    assert all(m.degree == 0 for m in metrics)
    assert len({m.community_id for m in metrics}) == 3


def test_two_clusters_are_detected_separately() -> None:
    left = [node(1), node(2), node(3)]
    right = [node(11), node(12), node(13)]
    edges = [
        (left[0], left[1], 1.0),
        (left[1], left[2], 1.0),
        (left[2], left[0], 1.0),
        (right[0], right[1], 1.0),
        (right[1], right[2], 1.0),
        (right[2], right[0], 1.0),
    ]

    metrics = {m.node_id: m for m in compute_metrics([*left, *right], edges)}

    left_communities = {metrics[n].community_id for n in left}
    right_communities = {metrics[n].community_id for n in right}
    assert len(left_communities) == 1
    assert len(right_communities) == 1
    assert left_communities != right_communities


def test_edges_outside_the_slice_are_ignored() -> None:
    """A filtered slice must not gain phantom vertices from dangling edges."""
    inside = [node(1), node(2)]
    edges = [(inside[0], inside[1], 1.0), (inside[0], node(99), 1.0)]

    metrics = compute_metrics(inside, edges)

    assert len(metrics) == 2
    assert {m.degree for m in metrics} == {1}


def test_community_detection_is_deterministic() -> None:
    first = compute_metrics(STAR_NODES, STAR_EDGES)
    second = compute_metrics(STAR_NODES, STAR_EDGES)

    assert [m.community_id for m in first] == [m.community_id for m in second]
