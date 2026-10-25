using System;
class Program {
    static void Main() {
        try {
            Random r = new Random();
            int x = r.Next(1, 0);
            Console.WriteLine("Success: " + x);
        } catch (Exception ex) {
            Console.WriteLine("Error: " + ex.GetType().Name + " - " + ex.Message);
        }
    }
}
