using System.Collections.Generic;
using Microsoft.Xna.Framework;
using Fathom.Core;

namespace Fathom.World;

/// <summary>
/// The flooded structure: an open, looping grid (maze carve + heavy braid + a start
/// room) so the player can always route around the predator. Provides wall queries
/// and simple circle-vs-grid collision.
/// </summary>
public sealed class Grid
{
    public readonly int Cols, Rows, Tile;
    public readonly bool[] Wall;     // true = solid
    public Vector2 StartPx;

    public Grid(int cols, int rows, int tile, Rng rng)
    {
        // Force odd dimensions for a clean maze.
        Cols = cols | 1; Rows = rows | 1; Tile = tile;
        Wall = new bool[Cols * Rows];
        for (int i = 0; i < Wall.Length; i++) Wall[i] = true;

        // Iterative DFS carve on odd cells.
        var stack = new Stack<(int x, int y)>();
        Carve(1, 1);
        stack.Push((1, 1));
        var dirs = new (int dx, int dy)[] { (0, -2), (0, 2), (-2, 0), (2, 0) };
        while (stack.Count > 0)
        {
            var (cx, cy) = stack.Peek();
            // shuffle dirs
            for (int i = 3; i > 0; i--) { int j = rng.Range(0, i); (dirs[i], dirs[j]) = (dirs[j], dirs[i]); }
            bool moved = false;
            foreach (var (dx, dy) in dirs)
            {
                int nx = cx + dx, ny = cy + dy;
                if (nx > 0 && ny > 0 && nx < Cols - 1 && ny < Rows - 1 && Wall[ny * Cols + nx])
                {
                    Carve(cx + dx / 2, cy + dy / 2);
                    Carve(nx, ny);
                    stack.Push((nx, ny));
                    moved = true;
                    break;
                }
            }
            if (!moved) stack.Pop();
        }

        // Start room (3x3) so you never spawn in a 1-wide dead-end.
        for (int y = 1; y <= 3 && y < Rows - 1; y++)
            for (int x = 1; x <= 3 && x < Cols - 1; x++)
                Carve(x, y);

        // Scattered open rooms — space to dodge and circle the predator.
        int rooms = 4 + (Cols * Rows) / 400;
        for (int r = 0; r < rooms; r++)
        {
            int rw = rng.Range(2, 4), rh = rng.Range(2, 4);
            int rx = rng.Range(1, Cols - 1 - rw), ry = rng.Range(1, Rows - 1 - rh);
            for (int y = ry; y < ry + rh && y < Rows - 1; y++)
                for (int x = rx; x < rx + rw && x < Cols - 1; x++)
                    Carve(x, y);
        }

        // Heavy braid: open most dead-ends into loops.
        for (int y = 1; y < Rows - 1; y++)
            for (int x = 1; x < Cols - 1; x++)
            {
                if (Wall[y * Cols + x]) continue;
                int open = 0;
                if (!Wall[(y - 1) * Cols + x]) open++;
                if (!Wall[(y + 1) * Cols + x]) open++;
                if (!Wall[y * Cols + x - 1]) open++;
                if (!Wall[y * Cols + x + 1]) open++;
                if (open <= 1 && rng.Chance(0.85))
                {
                    // knock a random surrounding wall (that isn't the border)
                    var cand = new List<(int, int)>();
                    if (y - 1 > 0) cand.Add((x, y - 1));
                    if (y + 1 < Rows - 1) cand.Add((x, y + 1));
                    if (x - 1 > 0) cand.Add((x - 1, y));
                    if (x + 1 < Cols - 1) cand.Add((x + 1, y));
                    if (cand.Count > 0) { var (wx, wy) = cand[rng.Range(0, cand.Count - 1)]; Carve(wx, wy); }
                }
            }

        StartPx = new Vector2(1.5f * Tile, 1.5f * Tile);
    }

    private void Carve(int x, int y) { if (x > 0 && y > 0 && x < Cols - 1 && y < Rows - 1) Wall[y * Cols + x] = false; }

    public bool IsWall(int tx, int ty)
        => tx < 0 || ty < 0 || tx >= Cols || ty >= Rows || Wall[ty * Cols + tx];

    public bool IsWallPx(float wx, float wy)
        => IsWall((int)(wx / Tile), (int)(wy / Tile));

    /// <summary>Find an open floor tile farthest (roughly) from start, for exits/spawns.</summary>
    public Vector2 FarFloorPx()
    {
        int bx = Cols - 2, by = Rows - 2;
        for (int y = Rows - 2; y > 0; y--)
            for (int x = Cols - 2; x > 0; x--)
                if (!Wall[y * Cols + x]) { bx = x; by = y; return new Vector2((bx + 0.5f) * Tile, (by + 0.5f) * Tile); }
        return new Vector2((bx + 0.5f) * Tile, (by + 0.5f) * Tile);
    }
}
