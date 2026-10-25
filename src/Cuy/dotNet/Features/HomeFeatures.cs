using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public static class HomeFeatures
    {
        private static List<IHomeFeature> _features = new List<IHomeFeature>();

        public static IReadOnlyList<IHomeFeature> All => _features;

        public static void LoadAll()
        {
            _features.Clear();

            try
            {
                var type = typeof(IHomeFeature);
                var types = Assembly.GetExecutingAssembly().GetTypes()
                    .Where(p => type.IsAssignableFrom(p) && !p.IsInterface && !p.IsAbstract);

                foreach (var t in types)
                {
                    try
                    {
                        var feature = (IHomeFeature)Activator.CreateInstance(t);
                        _features.Add(feature);
                    }
                    catch (Exception ex)
                    {
                        BrainController.Log($"[Features] Failed to instantiate feature {t.Name}: {ex.Message}");
                    }
                }

                _features = _features.OrderBy(f => f.Id).ToList();

                string ids = string.Join(", ", _features.Select(f => f.Id));
                BrainController.Log($"[Features] Loaded features: {ids}");
            }
            catch (Exception ex)
            {
                BrainController.Log($"[Features] Failed to load features: {ex.Message}");
            }
        }

        public static void InitializeAll(BrainController brain)
        {
            foreach (var feature in _features)
            {
                try
                {
                    feature.Initialize(brain);
                }
                catch (Exception ex)
                {
                    BrainController.Log($"[Feature {feature.Id}] Initialization error: {ex.Message}");
                }
            }
        }

        public static bool Dispatch(string type, JObject message, BrainController brain)
        {
            foreach (var feature in _features)
            {
                try
                {
                    if (feature.HandleMessage(type, message, brain))
                    {
                        return true;
                    }
                }
                catch (Exception ex)
                {
                    BrainController.Log($"[Feature {feature.Id}] HandleMessage error: {ex.Message}");
                }
            }
            return false;
        }

        public static void AddAllState(IDictionary<string, object> state, BrainController brain)
        {
            foreach (var feature in _features)
            {
                try
                {
                    feature.AddState(state, brain);
                }
                catch (Exception ex)
                {
                    BrainController.Log($"[Feature {feature.Id}] AddState error: {ex.Message}");
                }
            }
        }

        public static void TickAll(TimeSpan gameElapsed, BrainController brain)
        {
            foreach (var feature in _features)
            {
                try
                {
                    feature.Tick(gameElapsed, brain);
                }
                catch (Exception ex)
                {
                    BrainController.Log($"[Feature {feature.Id}] Tick error: {ex.Message}");
                }
            }
        }
    }
}
