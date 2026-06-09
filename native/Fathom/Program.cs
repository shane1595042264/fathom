using System;
using System.Linq;

namespace Fathom;

public static class Program
{
    [STAThread]
    public static void Main(string[] args)
    {
        // --shot renders a few frames offscreen, dumps a PNG to ./shots, and exits.
        // Used to verify rendering headlessly without a human at the keyboard.
        bool shot = args.Contains("--shot");
        using var game = new FathomGame(shot);
        game.Run();
    }
}
