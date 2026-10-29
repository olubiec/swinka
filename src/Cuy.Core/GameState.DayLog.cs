using System.Collections.Generic;

namespace Cuy.Core
{
    public sealed partial class GameState
    {
        public string DayLogDate { get; set; }

        private Dictionary<string, int> _dayLogCounters;
        public Dictionary<string, int> DayLogCounters
        {
            get
            {
                if (_dayLogCounters == null)
                {
                    _dayLogCounters = new Dictionary<string, int>();
                }
                return _dayLogCounters;
            }
            set
            {
                _dayLogCounters = value;
            }
        }

        public string DiaryLastWrittenDate { get; set; }
        public string DiaryLastTemplateId { get; set; }
    }
}
