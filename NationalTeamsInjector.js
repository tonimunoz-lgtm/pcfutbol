export const NationalTeamsInjector = {
  endOfWeek({ week }) {
    if (!isInternationalWeek(week)) return;

    getTopPlayers().forEach(p => {
      p.internationalDuty = true;
      p.fatigue += 10;
    });
  },

  beforeMatch({ team }) {
    team.players = team.players.filter(p => !p.internationalDuty);
  },

  endOfInternationalWeek() {
    allPlayers.forEach(p => {
      p.internationalDuty = false;
    });
  }
};
