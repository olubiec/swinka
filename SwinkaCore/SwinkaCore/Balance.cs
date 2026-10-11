using System;
using System.Collections.Generic;

namespace SwinkaCore
{
    /// <summary>
    /// Liczby balansu gry. Domyślne wartości z PLAN.md ("Model świnki") i swinka/dane/actions.json.
    /// To punkt startowy do testowania, nie ostateczny balans.
    /// </summary>
    public sealed class Balance
    {
        /// <summary>Spadek potrzeb na godzinę gry przy włączonym komputerze (tabela "Potrzeby").</summary>
        public Dictionary<Need, double> DecayPerHour { get; set; } = new Dictionary<Need, double>
        {
            { Need.Satiety, 8 },
            { Need.VitaminC, 4 },
            { Need.Energy, 6 },      // przy aktywności; podczas snu rośnie
            { Need.Mood, 5 },
            { Need.Cleanliness, 0 }, // zależy od bobków (faza B4), sama nie spada
            { Need.Teeth, 2 },
        };

        /// <summary>Gdy aplikacja była zamknięta, spadek jest 3x wolniejszy.</summary>
        public double OfflineDecayFactor { get; set; } = 1.0 / 3.0;

        /// <summary>Gdy aplikacja była zamknięta, potrzeby nie schodzą poniżej tej wartości.</summary>
        public double OfflineFloor { get; set; } = 20;

        /// <summary>
        /// Przy wyłączonym komputerze świnka śpi, więc energia rośnie (tak wychodzi w swinka/dane/symulacja.json:
        /// po weekendzie bez opieki energia = 100). Ustaw false, żeby energia spadała jak inne potrzeby.
        /// </summary>
        public bool OfflineCountsAsSleep { get; set; } = true;

        /// <summary>Przyrost energii na godzinę snu. Wartość robocza, do dostrojenia w B2/B3.</summary>
        public double SleepEnergyRegenPerHour { get; set; } = 15;

        /// <summary>Poniżej tej wartości zdarzenie NeedLow (35 = próg kwiczenia z actions.json).</summary>
        public double LowThreshold { get; set; } = 35;

        /// <summary>Poniżej tej wartości zdarzenie NeedCritical.</summary>
        public double CriticalThreshold { get; set; } = 15;

        /// <summary>
        /// Histereza: zdarzenie może przyjść ponownie dopiero, gdy potrzeba wróci powyżej progu + tej wartości.
        /// Dzięki temu wahania wokół progu nie zasypują zdarzeniami.
        /// </summary>
        public double ThresholdHysteresis { get; set; } = 5;

        /// <summary>1 dzień w realu = 3 tygodnie życia świnki.</summary>
        public double PigDaysPerRealDay { get; set; } = 21;

        /// <summary>
        /// Przerwa w wywołaniach Update dłuższa niż ten czas REALNY (np. uśpiony laptop)
        /// jest liczona według zasad offline, żeby świnka nie zgłodniała przez noc.
        /// </summary>
        public TimeSpan MaxOnlineGap { get; set; } = TimeSpan.FromMinutes(5);

        /// <summary>Dzienny limit punktów więzi, żeby nie dało się nabić poziomów w jeden wieczór.</summary>
        public int BondDailyLimit { get; set; } = 30;

        /// <summary>Najwyższy poziom więzi.</summary>
        public int MaxBondLevel { get; set; } = 20;

        /// <summary>
        /// Próg poziomu n = BondStep * n * (n - 1) / 2 punktów łącznie
        /// (poziom 2: 15, poziom 10: 675, poziom 20: 2850). Przy limicie 30/dzień poziom 10 wypada ok. 23. dnia.
        /// </summary>
        public int BondStep { get; set; } = 15;

        public static Balance CreateDefault()
        {
            return new Balance();
        }

        public double GetDecay(Need need)
        {
            double v;
            return DecayPerHour != null && DecayPerHour.TryGetValue(need, out v) ? v : 0;
        }

        /// <summary>Łączna liczba punktów więzi potrzebna do poziomu.</summary>
        public int BondPointsForLevel(int level)
        {
            if (level <= 1) return 0;
            return BondStep * level * (level - 1) / 2;
        }

        public int BondLevelForPoints(int points)
        {
            int level = 1;
            while (level < MaxBondLevel && points >= BondPointsForLevel(level + 1)) level++;
            return level;
        }
    }
}
