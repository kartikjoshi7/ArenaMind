import pytest

from backend.app.fan_services.arena_pathfinder import ArenaPathfinder


@pytest.fixture
def pathfinder():
    pf = ArenaPathfinder()
    # Mocking the graph for predictable, deterministic unit tests
    pf.nodes = {"Gate North": {}, "Concourse A": {}, "Section 101": {}, "VIP Lounge": {}}
    pf.adj_list = {
        "Gate North": [("Concourse A", 50, True), ("VIP Lounge", 100, False)],
        "Concourse A": [("Gate North", 50, True), ("Section 101", 30, True), ("VIP Lounge", 40, False)],
        "Section 101": [("Concourse A", 30, True)],
        "VIP Lounge": [("Gate North", 100, False), ("Concourse A", 40, False)]
    }
    return pf

def test_calculate_shortest_path_normal(pathfinder):
    path, distance, exploration, pruned = pathfinder.calculate_shortest_path("Gate North", "Section 101", requires_step_free=False)

    assert path == ["Gate North", "Concourse A", "Section 101"]
    assert distance == 80
    assert len(exploration) > 0
    assert len(pruned) == 0

def test_calculate_shortest_path_step_free(pathfinder):
    # If requires_step_free is True, the edge between Gate North and VIP Lounge (False) is pruned
    path, distance, _exploration, pruned = pathfinder.calculate_shortest_path("Gate North", "VIP Lounge", requires_step_free=True)

    # Actually, VIP Lounge has NO step_free paths connecting to it in our mock
    # So the path should be empty
    assert path == []
    assert distance == 0
    assert len(pruned) > 0
    assert {"source": "Gate North", "target": "VIP Lounge"} in pruned or {"source": "VIP Lounge", "target": "Gate North"} in pruned

def test_calculate_shortest_path_invalid_nodes(pathfinder):
    path, distance, _exploration, _pruned = pathfinder.calculate_shortest_path("Invalid Node", "Section 101")
    assert path == []
    assert distance == 0

def test_empty_graph():
    pf = ArenaPathfinder()
    pf.adj_list = {}
    path, distance, _exploration, _pruned = pf.calculate_shortest_path("Gate North", "Section 101")
    assert path == []
    assert distance == 0

def test_visited_node_loop(pathfinder):
    # Artificially add a loop where a node might be re-evaluated to hit line 63
    pathfinder.adj_list["Gate North"].append(("Gate North", 5, True))
    path, _dist, _expl, _pruned = pathfinder.calculate_shortest_path("Gate North", "Section 101")
    assert "Gate North" in path

def test_graph_file_not_found():
    import unittest.mock as mock
    with mock.patch('builtins.open', side_effect=FileNotFoundError):
        pf = ArenaPathfinder()
        assert pf.nodes == {}

def test_dijkstra_visited_node_skip():
    """
    Diamond graph: A->B(1), A->C(2), B->C(1), C->D(1).
    Node C is enqueued twice (via A at cost 2, via B at cost 2).
    When the second C is popped, it hits line 63 (continue).
    """
    pf = ArenaPathfinder()
    pf.nodes = {"A": {}, "B": {}, "C": {}, "D": {}}
    pf.adj_list = {
        "A": [("B", 1, True), ("C", 2, True)],
        "B": [("A", 1, True), ("C", 1, True)],
        "C": [("A", 2, True), ("B", 1, True), ("D", 1, True)],
        "D": [("C", 1, True)]
    }
    path, dist, exploration, _pruned = pf.calculate_shortest_path("A", "D")
    assert path == ["A", "B", "C", "D"]
    assert dist == 3
    # C was enqueued twice but only explored once — proves line 63 was hit
    assert exploration.count("C") == 1
