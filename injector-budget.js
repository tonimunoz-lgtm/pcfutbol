// injector-budget.js
(function() {
    const CATEGORY_BUDGETS = {
        'Primera División': 50_000_000,
        'Segunda División': 20_000_000,
        'Primera Ref': 5_000_000,
        'Segunda Ref': 2_000_000
    };

    const originalInitTeam = window.initializeTeam || function(team) { return team; };

    window.initializeTeam = function(team) {
        team.budget = CATEGORY_BUDGETS[team.category] || 1_000_000;
        team.stadiumCapacity = team.stadiumCapacity || 10000;
        return originalInitTeam(team);
    };
})();
