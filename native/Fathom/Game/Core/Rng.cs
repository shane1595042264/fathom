using System;

namespace Fathom.Core;

/// <summary>
/// Deterministic, seedable PRNG (xorshift128+ seeded via SplitMix64).
/// Reproducible level generation from a single seed — same seed, same dive.
/// </summary>
public sealed class Rng
{
    private ulong _s0, _s1;

    public Rng(ulong seed)
    {
        _s0 = SplitMix(ref seed);
        _s1 = SplitMix(ref seed);
        if (_s0 == 0 && _s1 == 0) _s1 = 0x9E3779B97F4A7C15UL;
    }

    private static ulong SplitMix(ref ulong x)
    {
        x += 0x9E3779B97F4A7C15UL;
        ulong z = x;
        z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9UL;
        z = (z ^ (z >> 27)) * 0x94D049BB133111EBUL;
        return z ^ (z >> 31);
    }

    public ulong NextU64()
    {
        ulong s1 = _s0, s0 = _s1;
        _s0 = s0;
        s1 ^= s1 << 23;
        _s1 = s1 ^ s0 ^ (s1 >> 18) ^ (s0 >> 5);
        return _s1 + s0;
    }

    /// <summary>double in [0,1).</summary>
    public double NextDouble() => (NextU64() >> 11) * (1.0 / 9007199254740992.0);

    /// <summary>float in [0,1).</summary>
    public float NextFloat() => (float)NextDouble();

    /// <summary>int in [min, max] inclusive.</summary>
    public int Range(int min, int max)
    {
        if (max <= min) return min;
        ulong span = (ulong)(max - min + 1);
        return min + (int)(NextU64() % span);
    }

    public bool Chance(double p) => NextDouble() < p;
}
