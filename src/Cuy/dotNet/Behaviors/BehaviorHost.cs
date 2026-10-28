using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace Cuy.Behaviors
{
    public class BehaviorHost
    {
        private List<IDesktopBehavior> _behaviors = new List<IDesktopBehavior>();
        private Dictionary<string, int> _errorCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        private HashSet<string> _runningIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        public HashSet<string> DisabledIds { get; } = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        public BehaviorHost()
        {
            DisabledIds.Add("sample");
            LoadAll();
        }

        private void LoadAll()
        {
            _behaviors.Clear();

            try
            {
                var type = typeof(IDesktopBehavior);
                var types = Assembly.GetExecutingAssembly().GetTypes()
                    .Where(p => type.IsAssignableFrom(p) && !p.IsInterface && !p.IsAbstract);

                foreach (var t in types)
                {
                    try
                    {
                        var behavior = (IDesktopBehavior)Activator.CreateInstance(t);
                        _behaviors.Add(behavior);
                    }
                    catch (Exception ex)
                    {
                        BrainController.Log($"[BehaviorHost] Failed to instantiate behavior {t.Name}: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                BrainController.Log($"[BehaviorHost] Failed to load behaviors: {ex.Message}");
            }
        }

        private void TrackError(IDesktopBehavior behavior)
        {
            var id = behavior.Id;
            if (!_errorCounts.ContainsKey(id))
            {
                _errorCounts[id] = 0;
            }
            _errorCounts[id]++;

            if (_errorCounts[id] >= 5)
            {
                DisabledIds.Add(id);
                BrainController.Log($"[Behavior] {id} disabled");
                if (_runningIds.Contains(id))
                {
                    try
                    {
                        behavior.Stop();
                        _runningIds.Remove(id);
                    }
                    catch
                    {
                        // Ignore errors during emergency stop
                    }
                }
            }
        }

        public void Start(BehaviorContext ctx)
        {
            foreach (var behavior in _behaviors)
            {
                var id = behavior.Id;
                if (DisabledIds.Contains(id))
                    continue;

                try
                {
                    behavior.Start(ctx);
                    _runningIds.Add(id);
                    BrainController.Log($"[Behavior] {id} started");
                }
                catch (Exception ex)
                {
                    BrainController.Log($"[Behavior] {id} error on Start: {ex.Message}");
                    TrackError(behavior);
                }
            }
        }

        public void Tick(TimeSpan dt)
        {
            foreach (var behavior in _behaviors)
            {
                var id = behavior.Id;
                if (DisabledIds.Contains(id) || !_runningIds.Contains(id))
                    continue;

                try
                {
                    behavior.Tick(dt);
                }
                catch (Exception ex)
                {
                    BrainController.Log($"[Behavior] {id} error on Tick: {ex.Message}");
                    TrackError(behavior);
                }
            }
        }

        public void Stop()
        {
            foreach (var behavior in _behaviors)
            {
                var id = behavior.Id;
                if (!_runningIds.Contains(id))
                    continue;

                try
                {
                    behavior.Stop();
                    _runningIds.Remove(id);
                    BrainController.Log($"[Behavior] {id} stopped");
                }
                catch (Exception ex)
                {
                    BrainController.Log($"[Behavior] {id} error on Stop: {ex.Message}");
                    TrackError(behavior);
                }
            }
        }
    }
}
