import heapq
import json
import os
from typing import Any

GRAPH_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'arena_venue_graph.json')

class ArenaPathfinder:
    def __init__(self) -> None:
        self.nodes: dict[str, Any] = {}
        self.adj_list: dict[str, Any] = {}
        self._load_graph()

    def _load_graph(self) -> None:
        try:
            with open(GRAPH_PATH) as f:
                data = json.load(f)
                self.nodes = data.get("nodes", {})
                edges = data.get("edges", [])

                for node in self.nodes:
                    self.adj_list[node] = []

                # Build undirected graph adjacency list
                for edge in edges:
                    src = edge["source"]
                    dst = edge["target"]
                    dist = edge["distance"]
                    step_free = edge["step_free"]

                    if src in self.adj_list and dst in self.adj_list:
                        self.adj_list[src].append((dst, dist, step_free))
                        self.adj_list[dst].append((src, dist, step_free))
        except FileNotFoundError:
            # Fallback if graph fails to load
            pass

    def calculate_shortest_path(self, origin: str, destination: str, requires_step_free: bool = False) -> tuple[list[str], int, list[str], list[dict[str, str]]]:
        """
        Calculates the mathematically guaranteed shortest path using Dijkstra's algorithm.
        Prunes edges that are not step_free if the user requires accommodations.
        Returns: (path, distance, exploration_history, pruned_edges)
        """
        if origin not in self.adj_list or destination not in self.adj_list:
            return [], 0, [], []

        # Priority queue for Dijkstra: (distance, current_node, path_taken)
        pq = [(0, origin, [origin])]
        visited = set()

        exploration_history: list[str] = []
        pruned_edges: list[dict[str, str]] = []
        # Keep track of pruned to avoid duplicates (undirected edges mean A->B and B->A might both be pruned)
        seen_pruned = set()

        while pq:
            curr_dist, curr_node, path = heapq.heappop(pq)

            if curr_node == destination:
                return path, curr_dist, exploration_history, pruned_edges

            if curr_node in visited:
                continue

            visited.add(curr_node)
            exploration_history.append(curr_node)

            for neighbor, weight, is_step_free in self.adj_list.get(curr_node, []):
                if neighbor not in visited:
                    # Prune the edge if the user requires step free but this edge has stairs
                    if requires_step_free and not is_step_free:
                        edge_id = tuple(sorted([curr_node, neighbor]))
                        if edge_id not in seen_pruned:
                            seen_pruned.add(edge_id)
                            pruned_edges.append({"source": curr_node, "target": neighbor})
                        continue

                    heapq.heappush(pq, (curr_dist + weight, neighbor, [*path, neighbor]))

        return [], 0, exploration_history, pruned_edges # No path found
