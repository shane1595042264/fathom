using System;
using System.Collections.Generic;
using System.IO;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Input;
using Fathom.Core;
using Fathom.World;

namespace Fathom;

/// <summary>
/// M1 — native echolocation core: a generated flooded structure rendered in real
/// darkness via render-target lighting, revealed by an expanding sonar wavefront that
/// lingers and fades (world-space reveal buffer, so it doesn't smear when you move).
/// </summary>
public sealed class FathomGame : Game
{
    // ---- tunables ----
    const int ScreenW = 1280, ScreenH = 720;
    const float PingSpeed = 520f, PingMax = 720f, PingCooldown = 0.85f;
    const float PassiveRadius = 64f, PlayerSpeed = 175f, QuietMult = 0.45f, PlayerRadius = 9f;
    static readonly Color Ambient = new Color(14, 16, 20);
    static readonly Color WallColor = new Color(30, 72, 92);
    static readonly Color SonarColor = new Color(120, 220, 255);
    static readonly Color GlowColor = new Color(48, 110, 140);

    private readonly GraphicsDeviceManager _gdm;
    private SpriteBatch _sb;
    private Texture2D _px, _glow, _ring;
    private RenderTarget2D _revealRT, _lightRT, _frameRT;
    private BlendState _multiply, _addRgb;
    private bool _revealInit;

    private Grid _grid;
    private Vector2 _player, _vel;
    private float _pingCd;

    private struct Ping { public Vector2 Origin; public float Age; }
    private readonly List<Ping> _pings = new();

    private readonly bool _shotMode;
    private int _frame;
    private bool _saved;
    private readonly Vector2 _center = new Vector2(ScreenW / 2f, ScreenH / 2f);

    public FathomGame(bool shotMode)
    {
        _shotMode = shotMode;
        _gdm = new GraphicsDeviceManager(this)
        {
            PreferredBackBufferWidth = ScreenW,
            PreferredBackBufferHeight = ScreenH,
        };
        Content.RootDirectory = "Content";
        IsMouseVisible = true;
        IsFixedTimeStep = true;
    }

    protected override void Initialize()
    {
        Window.Title = "FATHOM";
        _grid = new Grid(23, 23, 48, new Rng(1337));
        _player = _grid.StartPx;
        base.Initialize();
    }

    protected override void LoadContent()
    {
        _sb = new SpriteBatch(GraphicsDevice);
        _px = new Texture2D(GraphicsDevice, 1, 1);
        _px.SetData(new[] { Color.White });
        _glow = MakeRadialDisk(256);
        _ring = MakeRing(256, 0.82f, 0.16f);

        int levelW = _grid.Cols * _grid.Tile, levelH = _grid.Rows * _grid.Tile;
        _revealRT = new RenderTarget2D(GraphicsDevice, levelW, levelH);
        _lightRT = new RenderTarget2D(GraphicsDevice, ScreenW, ScreenH);
        _frameRT = new RenderTarget2D(GraphicsDevice, ScreenW, ScreenH);

        _multiply = new BlendState
        {
            ColorSourceBlend = Blend.DestinationColor,
            ColorDestinationBlend = Blend.Zero,
            AlphaSourceBlend = Blend.DestinationAlpha,
            AlphaDestinationBlend = Blend.Zero,
        };
        _addRgb = new BlendState
        {
            ColorSourceBlend = Blend.One,
            ColorDestinationBlend = Blend.One,
            AlphaSourceBlend = Blend.One,
            AlphaDestinationBlend = Blend.One,
        };
    }

    protected override void Update(GameTime gameTime)
    {
        float dt = (float)gameTime.ElapsedGameTime.TotalSeconds;
        if (dt > 0.05f) dt = 0.05f;
        var ks = Keyboard.GetState();
        if (!_shotMode && ks.IsKeyDown(Keys.Escape)) Exit();

        // movement
        Vector2 mv = Vector2.Zero;
        bool quiet;
        if (_shotMode)
        {
            mv = new Vector2(0.6f, 0.3f);
            quiet = false;
        }
        else
        {
            if (ks.IsKeyDown(Keys.W) || ks.IsKeyDown(Keys.Up)) mv.Y -= 1;
            if (ks.IsKeyDown(Keys.S) || ks.IsKeyDown(Keys.Down)) mv.Y += 1;
            if (ks.IsKeyDown(Keys.A) || ks.IsKeyDown(Keys.Left)) mv.X -= 1;
            if (ks.IsKeyDown(Keys.D) || ks.IsKeyDown(Keys.Right)) mv.X += 1;
            quiet = ks.IsKeyDown(Keys.LeftShift) || ks.IsKeyDown(Keys.RightShift);
        }
        if (mv != Vector2.Zero) mv.Normalize();
        float spd = PlayerSpeed * (quiet ? QuietMult : 1f);
        _vel = mv * spd;
        MoveWithCollision(_vel * dt);

        // ping
        _pingCd -= dt;
        bool wantPing = _shotMode ? (_frame == 4) : ks.IsKeyDown(Keys.Space);
        if (wantPing && _pingCd <= 0f)
        {
            _pings.Add(new Ping { Origin = _player, Age = 0f });
            _pingCd = PingCooldown;
        }
        for (int i = _pings.Count - 1; i >= 0; i--)
        {
            var p = _pings[i];
            p.Age += dt;
            _pings[i] = p;
            if (p.Age * PingSpeed > PingMax + 40f) _pings.RemoveAt(i);
        }

        _frame++;
        base.Update(gameTime);
    }

    private void MoveWithCollision(Vector2 d)
    {
        Vector2 nx = _player + new Vector2(d.X, 0);
        if (!Blocked(nx)) _player.X = nx.X;
        Vector2 ny = _player + new Vector2(0, d.Y);
        if (!Blocked(ny)) _player.Y = ny.Y;
    }

    private bool Blocked(Vector2 c)
    {
        float r = PlayerRadius;
        return _grid.IsWallPx(c.X - r, c.Y - r) || _grid.IsWallPx(c.X + r, c.Y - r)
            || _grid.IsWallPx(c.X - r, c.Y + r) || _grid.IsWallPx(c.X + r, c.Y + r);
    }

    protected override void Draw(GameTime gameTime)
    {
        UpdateRevealRT();
        BuildLightRT();

        // composite scene * light into the frame target
        GraphicsDevice.SetRenderTarget(_frameRT);
        GraphicsDevice.Clear(new Color(4, 5, 7));
        DrawWorld();
        _sb.Begin(blendState: _multiply, samplerState: SamplerState.PointClamp);
        _sb.Draw(_lightRT, new Rectangle(0, 0, ScreenW, ScreenH), Color.White);
        _sb.End();
        GraphicsDevice.SetRenderTarget(null);

        if (_shotMode && _frame >= 30 && !_saved) { SaveShot(_frameRT); _saved = true; Exit(); }

        GraphicsDevice.Clear(Color.Black);
        _sb.Begin();
        _sb.Draw(_frameRT, new Rectangle(0, 0, ScreenW, ScreenH), Color.White);
        _sb.End();
        base.Draw(gameTime);
    }

    // Accumulate sonar reveal in WORLD space (so it doesn't smear as the camera moves).
    private void UpdateRevealRT()
    {
        GraphicsDevice.SetRenderTarget(_revealRT);
        if (!_revealInit) { GraphicsDevice.Clear(Color.Black); _revealInit = true; }

        // fade previous reveal toward black
        _sb.Begin(blendState: BlendState.AlphaBlend);
        _sb.Draw(_px, new Rectangle(0, 0, _revealRT.Width, _revealRT.Height), new Color(0, 0, 0, 8));
        _sb.End();

        // deposit the current wavefront of each ping
        _sb.Begin(blendState: BlendState.Additive);
        foreach (var p in _pings)
        {
            float radius = p.Age * PingSpeed;
            if (radius < 6f || radius > PingMax) continue;
            float strength = MathHelper.Clamp(1f - radius / PingMax, 0.15f, 1f);
            DrawRing(p.Origin, radius, new Color(SonarColor.R, SonarColor.G, SonarColor.B) * strength);
        }
        _sb.End();
    }

    private void BuildLightRT()
    {
        GraphicsDevice.SetRenderTarget(_lightRT);
        GraphicsDevice.Clear(Ambient);

        Vector2 worldOriginOnScreen = _center - _player; // camera centered on player

        // bring the world-space reveal into screen space
        _sb.Begin(blendState: _addRgb, samplerState: SamplerState.PointClamp);
        _sb.Draw(_revealRT, worldOriginOnScreen, Color.White);
        _sb.End();

        // player's faint passive glow
        _sb.Begin(blendState: BlendState.Additive);
        DrawDisk(_center, PassiveRadius, new Color(GlowColor.R, GlowColor.G, GlowColor.B, (byte)150));
        _sb.End();
    }

    private void DrawWorld()
    {
        Vector2 cam = _player - _center; // top-left world coord on screen
        int t = _grid.Tile;
        int x0 = Math.Max(0, (int)(cam.X / t) - 1), x1 = Math.Min(_grid.Cols - 1, (int)((cam.X + ScreenW) / t) + 1);
        int y0 = Math.Max(0, (int)(cam.Y / t) - 1), y1 = Math.Min(_grid.Rows - 1, (int)((cam.Y + ScreenH) / t) + 1);

        _sb.Begin(samplerState: SamplerState.PointClamp);
        for (int ty = y0; ty <= y1; ty++)
            for (int tx = x0; tx <= x1; tx++)
                if (_grid.IsWall(tx, ty))
                {
                    var r = new Rectangle((int)(tx * t - cam.X), (int)(ty * t - cam.Y), t, t);
                    _sb.Draw(_px, r, WallColor);
                }
        // player
        _sb.Draw(_px, new Rectangle((int)(_center.X - 7), (int)(_center.Y - 7), 14, 14), new Color(150, 235, 255));
        _sb.End();
    }

    private void DrawDisk(Vector2 center, float radius, Color tint)
        => _sb.Draw(_glow, new Rectangle((int)(center.X - radius), (int)(center.Y - radius), (int)(radius * 2), (int)(radius * 2)), tint);

    private void DrawRing(Vector2 center, float radius, Color tint)
    {
        float half = radius / 0.82f; // ring texture peaks at 0.82 of half-size
        _sb.Draw(_ring, new Rectangle((int)(center.X - half), (int)(center.Y - half), (int)(half * 2), (int)(half * 2)), tint);
    }

    private Texture2D MakeRadialDisk(int size)
    {
        var data = new Color[size * size];
        float c = (size - 1) / 2f, maxR = size / 2f;
        for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
            {
                float d = MathF.Sqrt((x - c) * (x - c) + (y - c) * (y - c)) / maxR;
                float v = MathHelper.Clamp(1f - d, 0f, 1f); v *= v;
                data[y * size + x] = new Color((byte)255, (byte)255, (byte)255, (byte)(v * 255));
            }
        var tex = new Texture2D(GraphicsDevice, size, size);
        tex.SetData(data);
        return tex;
    }

    private Texture2D MakeRing(int size, float peakNorm, float thickness)
    {
        var data = new Color[size * size];
        float c = (size - 1) / 2f, maxR = size / 2f;
        for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
            {
                float d = MathF.Sqrt((x - c) * (x - c) + (y - c) * (y - c)) / maxR;
                float v = MathHelper.Clamp(1f - MathF.Abs(d - peakNorm) / thickness, 0f, 1f); v *= v;
                data[y * size + x] = new Color((byte)255, (byte)255, (byte)255, (byte)(v * 255));
            }
        var tex = new Texture2D(GraphicsDevice, size, size);
        tex.SetData(data);
        return tex;
    }

    private void SaveShot(RenderTarget2D rt)
    {
        try
        {
            Directory.CreateDirectory("shots");
            using var fs = File.Create(Path.Combine("shots", "frame.png"));
            rt.SaveAsPng(fs, rt.Width, rt.Height);
            Console.WriteLine("[shot] wrote shots/frame.png");
        }
        catch (Exception e) { Console.WriteLine("[shot] failed: " + e.Message); }
    }
}
