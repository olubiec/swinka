using Newtonsoft.Json;

namespace Cuy.Core.Music
{
    public enum MusicPlaceError
    {
        None,
        BadRoom,
        UnknownPlayer,
        NotOwned,
        RoomOccupied,
        NothingInRoom
    }

    /// <summary>Placing a music player in a room (A5): playerOwned &lt;-&gt; playerPlaced. Pure rules, mirrors features/music/world.js.</summary>
    public static class MusicPlacement
    {
        /// <summary>Moves an owned player into an empty room. Changes the state only when it returns None.</summary>
        public static MusicPlaceError Place(GameState state, string roomId, string playerId)
        {
            if (state == null || string.IsNullOrEmpty(roomId)) return MusicPlaceError.BadRoom;
            if (!MusicPrices.PlayerPriceById.ContainsKey(playerId ?? "")) return MusicPlaceError.UnknownPlayer;
            if (state.PlayerPlaced.ContainsKey(roomId)) return MusicPlaceError.RoomOccupied;
            if (!state.PlayerOwned.Contains(playerId)) return MusicPlaceError.NotOwned;

            state.PlayerOwned.Remove(playerId);
            state.PlayerPlaced[roomId] = playerId;
            return MusicPlaceError.None;
        }

        /// <summary>Takes the player out of a room back to the owned list. Changes the state only when it returns None.</summary>
        public static MusicPlaceError PickUp(GameState state, string roomId)
        {
            if (state == null || string.IsNullOrEmpty(roomId)) return MusicPlaceError.BadRoom;
            string playerId;
            if (!state.PlayerPlaced.TryGetValue(roomId, out playerId)) return MusicPlaceError.NothingInRoom;

            state.PlayerPlaced.Remove(roomId);
            if (!state.PlayerOwned.Contains(playerId)) state.PlayerOwned.Add(playerId);
            return MusicPlaceError.None;
        }
    }
}
