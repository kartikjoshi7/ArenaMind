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
    path, distance, exploration, pruned = pathfinder.calculate_shortest_path("Gate North", "VIP Lounge", requires_step_free=True)
    
    # Actually, VIP Lounge has NO step_free paths connecting to it in our mock
    # So the path should be empty
    assert path == []
    assert distance == 0
    assert len(pruned) > 0
    assert {"source": "Gate North", "target": "VIP Lounge"} in pruned or {"source": "VIP Lounge", "target": "Gate North"} in pruned

def test_calculate_shortest_path_invalid_nodes(pathfinder):
    path, distance, exploration, pruned = pathfinder.calculate_shortest_path("Invalid Node", "Section 101")
    assert path == []
    assert distance == 0

def test_empty_graph():
    pf = ArenaPathfinder()
    pf.adj_list = {}
    path, distance, exploration, pruned = pf.calculate_shortest_path("Gate North", "Section 101")
    assert path == []
    assert distance == 0

def test_visited_node_loop(pathfinder):
    # Artificially add a loop where a node might be re-evaluated to hit line 63
    pathfinder.adj_list["Gate North"].append(("Gate North", 5, True))
    path, dist, expl, pruned = pathfinder.calculate_shortest_path("Gate North", "Section 101")
    assert "Gate North" in path

def test_graph_file_not_found():
    import unittest.mock as mock
    with mock.patch('builtins.open', side_effect=FileNotFoundError):
        pf = ArenaPathfinder()
        assert pf.nodes == {}
