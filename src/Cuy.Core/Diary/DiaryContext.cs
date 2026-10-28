using System;

namespace Cuy.Core.Diary
{
    public class DiaryContext
    {
        public string Name { get; set; }
        public LifeStage Stage { get; set; }
        public string Mood { get; set; }
        public bool Sick { get; set; }
        public bool Birthday { get; set; }
        public string Weather { get; set; }
        public int Fed { get; set; }
        public int Pets { get; set; }
        public int Games { get; set; }
        public int Poops { get; set; }
        public int Clovers { get; set; }
        public string FavoriteVegetable { get; set; }
        public string PreviousTemplateId { get; set; }

        public DiaryContext()
        {
            Weather = "any";
        }
    }
}
