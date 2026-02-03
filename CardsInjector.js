export const CardsInjector = {
  afterMatch({ match, stats }) {
    match.players.forEach(p => {
      if (Math.random() < getYellowChance(p)) {
        p.cards.yellow++;
      }

      if (Math.random() < getRedChance(p)) {
        p.cards.red++;
        p.suspension += 2;
      }

      if (p.cards.yellow % 5 === 0) {
        p.suspension += 1;
      }
    });
  },

  beforeMatch({ team }) {
    team.players = team.players.filter(p => p.suspension === 0);
  },

  endOfWeek() {
    allPlayers.forEach(p => {
      if (p.suspension > 0) p.suspension--;
    });
  }
};
