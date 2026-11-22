using System;
using System.Collections.Generic;
using Cuy.Core;
using Cuy.Core.Input.Validation;
using Cuy.Core.World;
using Newtonsoft.Json.Linq;

namespace Cuy.Features
{
    public sealed class PropsFeature : HomeFeatureBase
    {
        public override string Id => "props";

        private readonly List<DesktopProp> _desktop = new List<DesktopProp>();

        public event EventHandler<IReadOnlyList<DesktopProp>> PropsChanged;

        public IReadOnlyList<DesktopProp> CurrentProps => _desktop;

        public override void AddState(IDictionary<string, object> state, BrainController brain)
        {
            var pet = brain?.Pet;
            if (pet == null || state == null) return;

            var world = pet.EnsureWorld();
            var gameState = pet.State;
            var catalog = DesktopPropCatalog.Current;

            var desktopList = new List<object>();
            foreach (var prop in _desktop)
            {
                if (prop == null) continue;
                var def = catalog.Find(prop.ItemId);
                desktopList.Add(new
                {
                    uid = prop.Uid,
                    itemId = prop.ItemId,
                    name = def?.Name ?? prop.ItemId,
                    icon = def?.Icon ?? prop.ItemId,
                    sprite = def?.Sprite,
                    x = prop.X,
                    y = prop.Y
                });
            }

            var inRoomsList = new List<object>();
            if (world?.Rooms != null)
            {
                foreach (var kv in world.Rooms)
                {
                    if (kv.Value?.Items == null) continue;
                    foreach (var placed in kv.Value.Items)
                    {
                        if (placed == null) continue;
                        var def = catalog.Find(placed.ItemId);
                        if (def == null) continue;
                        inRoomsList.Add(new
                        {
                            roomId = kv.Key,
                            uid = placed.Uid,
                            itemId = placed.ItemId,
                            name = def.Name
                        });
                    }
                }
            }

            var freeList = new List<object>();
            foreach (var def in catalog.All)
            {
                int free = DesktopPropOps.FreeCount(_desktop, world, gameState, def.ItemId, catalog);
                if (free <= 0) continue;
                freeList.Add(new
                {
                    itemId = def.ItemId,
                    name = def.Name,
                    icon = def.Icon,
                    count = free
                });
            }

            state["props"] = new
            {
                max = catalog.MaxOnDesktop,
                desktop = desktopList,
                inRooms = inRoomsList,
                free = freeList
            };
        }

        public override bool HandleMessage(string type, JObject message, BrainController brain)
        {
            if (string.IsNullOrWhiteSpace(type)) return false;
            if (!IsPropsMessage(type)) return false;

            var pet = brain?.Pet;
            if (pet == null) return true;

            string err = PropsMessages.Validate(type, message);
            if (err != null)
            {
                BrainController.Log($"[Props] Rejected {type}: {err}");
                return true;
            }

            var world = pet.EnsureWorld();
            var gameState = pet.State;
            var catalog = DesktopPropCatalog.Current;

            switch (type)
            {
                case "props.place":
                case "prop_place":
                {
                    string itemId = message.Value<string>("itemId");
                    double x = message.Value<double>("x");
                    double y = message.Value<double>("y");
                    var res = DesktopPropOps.PutOnDesktop(_desktop, world, gameState, itemId, x, y, catalog, out _);
                    HandleResult(res, pet, countPlacement: true);
                    return true;
                }

                case "props.move":
                case "prop_move":
                {
                    string uid = message.Value<string>("uid");
                    double x = message.Value<double>("x");
                    double y = message.Value<double>("y");
                    var res = DesktopPropOps.MoveOnDesktop(_desktop, uid, x, y);
                    HandleResult(res, pet, countPlacement: false);
                    return true;
                }

                case "props.remove":
                case "prop_remove":
                {
                    string uid = message.Value<string>("uid");
                    var res = DesktopPropOps.RemoveFromDesktop(_desktop, uid);
                    HandleResult(res, pet, countPlacement: false);
                    return true;
                }

                case "props.toRoom":
                case "prop_to_room":
                {
                    string uid = message.Value<string>("uid");
                    string roomId = message.Value<string>("room");
                    int x = message.Value<int>("x");
                    int y = message.Value<int>("y");
                    var placeCatalog = pet.PlaceCatalog ?? PlaceCatalog.Current;
                    var (cols, rows) = PlaceUnlock.GridSize(world, placeCatalog, roomId);
                    if (cols <= 0) cols = 8;
                    if (rows <= 0) rows = 6;
                    var res = DesktopPropOps.ToRoom(_desktop, world, gameState, uid, roomId, x, y, cols, rows, 2, WorldItemCatalog.Current, catalog);
                    HandleResult(res, pet, countPlacement: false);
                    return true;
                }

                case "props.fromRoom":
                case "prop_from_room":
                {
                    string roomId = message.Value<string>("room");
                    string uid = message.Value<string>("uid");
                    double x = message.Value<double>("x");
                    double y = message.Value<double>("y");
                    var res = DesktopPropOps.FromRoom(_desktop, world, roomId, uid, x, y, catalog);
                    HandleResult(res, pet, countPlacement: res == DesktopPropResult.Ok);
                    return true;
                }

                default:
                    return false;
            }
        }

        private void HandleResult(DesktopPropResult res, Pet pet, bool countPlacement)
        {
            switch (res)
            {
                case DesktopPropResult.Ok:
                    if (countPlacement)
                    {
                        pet.Count("props_placed");
                    }
                    NotifyPropsChanged();
                    HomeWindow.NotifyStateChanged();
                    break;

                case DesktopPropResult.Stored:
                    HomeWindow.PostToPage(new { type = "toast", text = "The desktop is full" });
                    NotifyPropsChanged();
                    HomeWindow.NotifyStateChanged();
                    break;

                case DesktopPropResult.Full:
                    HomeWindow.PostToPage(new { type = "toast", text = "The desktop is full" });
                    break;

                case DesktopPropResult.NotOwned:
                    HomeWindow.PostToPage(new { type = "toast", text = "Item is not owned" });
                    break;

                case DesktopPropResult.RoomRefused:
                    HomeWindow.PostToPage(new { type = "toast", text = "Something is in the way" });
                    break;
            }
        }

        private void NotifyPropsChanged()
        {
            try
            {
                PropsChanged?.Invoke(this, _desktop.AsReadOnly());
            }
            catch (Exception ex)
            {
                BrainController.Log("[Props] PropsChanged listener error: " + ex.Message);
            }
        }

        private static bool IsPropsMessage(string type)
        {
            return type == "props.place" || type == "prop_place"
                || type == "props.move" || type == "prop_move"
                || type == "props.remove" || type == "prop_remove"
                || type == "props.toRoom" || type == "prop_to_room"
                || type == "props.fromRoom" || type == "prop_from_room";
        }
    }
}
