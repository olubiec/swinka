using Cuy.Core;
using Cuy.Core.Music;
using Xunit;

namespace Cuy.Core.Tests
{
    public class MusicPlaceTests
    {
        private const string Player = "player_turntable";
        private const string Other = "player_jukebox";
        private const string Room = "salon";

        private static GameState WithOwned(params string[] players)
        {
            var state = new GameState();
            state.PlayerOwned.AddRange(players);
            return state;
        }

        [Fact]
        public void PlaceMovesOwnedPlayerIntoEmptyRoom()
        {
            var state = WithOwned(Player);

            Assert.Equal(MusicPlaceError.None, MusicPlacement.Place(state, Room, Player));

            Assert.Empty(state.PlayerOwned);
            Assert.Equal(Player, state.PlayerPlaced[Room]);
        }

        [Fact]
        public void PickUpReturnsPlayerToOwnedList()
        {
            var state = WithOwned(Player);
            MusicPlacement.Place(state, Room, Player);

            Assert.Equal(MusicPlaceError.None, MusicPlacement.PickUp(state, Room));

            Assert.Empty(state.PlayerPlaced);
            Assert.Equal(new[] { Player }, state.PlayerOwned);
        }

        [Fact]
        public void PlaceAndPickUpRoundTripKeepsOnePlayer()
        {
            var state = WithOwned(Player);
            MusicPlacement.Place(state, Room, Player);
            MusicPlacement.PickUp(state, Room);
            MusicPlacement.Place(state, Room, Player);

            Assert.Empty(state.PlayerOwned);
            Assert.Equal(Player, state.PlayerPlaced[Room]);
        }

        [Fact]
        public void NotOwnedPlayerIsRefusedAndChangesNothing()
        {
            var state = WithOwned(Other);

            Assert.Equal(MusicPlaceError.NotOwned, MusicPlacement.Place(state, Room, Player));

            Assert.Equal(new[] { Other }, state.PlayerOwned);
            Assert.Empty(state.PlayerPlaced);
        }

        [Fact]
        public void UnknownPlayerIsRefused()
        {
            var state = WithOwned("player_nope");

            Assert.Equal(MusicPlaceError.UnknownPlayer, MusicPlacement.Place(state, Room, "player_nope"));
            Assert.Empty(state.PlayerPlaced);
        }

        [Fact]
        public void OccupiedRoomIsRefusedAndKeepsBothPlayers()
        {
            var state = WithOwned(Player, Other);
            MusicPlacement.Place(state, Room, Player);

            Assert.Equal(MusicPlaceError.RoomOccupied, MusicPlacement.Place(state, Room, Other));

            Assert.Equal(Player, state.PlayerPlaced[Room]);
            Assert.Equal(new[] { Other }, state.PlayerOwned);
        }

        [Fact]
        public void EmptyRoomIdIsRefused()
        {
            var state = WithOwned(Player);

            Assert.Equal(MusicPlaceError.BadRoom, MusicPlacement.Place(state, "", Player));
            Assert.Equal(MusicPlaceError.BadRoom, MusicPlacement.PickUp(state, null));
            Assert.Equal(new[] { Player }, state.PlayerOwned);
        }

        [Fact]
        public void PickUpFromEmptyRoomChangesNothing()
        {
            var state = WithOwned(Player);

            Assert.Equal(MusicPlaceError.NothingInRoom, MusicPlacement.PickUp(state, Room));
            Assert.Equal(new[] { Player }, state.PlayerOwned);
        }

        [Fact]
        public void OldSaveWithoutMusicFieldsDoesNotThrow()
        {
            var state = new GameState();
            state.EnsureMusic();

            Assert.Equal(MusicPlaceError.NotOwned, MusicPlacement.Place(state, Room, Player));
            Assert.Equal(MusicPlaceError.NothingInRoom, MusicPlacement.PickUp(state, Room));
        }
    }
}
