function calculateWeeksLeft() {
    const lang = document.documentElement.lang === "pl" ? "pl" : "en";
    const copy = {
        en: {
            invalid: "Enter a birth date",
            result: (weeksLeft) => `${weeksLeft} weeks left`,
            summary: (weeks, percentage, year) => `You have lived through <b>${weeks}</b> weeks, or <b>${percentage}%</b> of a 90-year life.<br>If you live to 90, the last year is <b>${year}</b>.`
        },
        pl: {
            invalid: "Wpisz datę urodzenia",
            result: (weeksLeft) => `Zostało ${weeksLeft} tygodni`,
            summary: (weeks, percentage, year) => `Masz za sobą <b>${weeks}</b> tygodni, czyli <b>${percentage}%</b> modelu 90 lat.<br>Jeśli dożyjesz 90 lat, ostatni rok to <b>${year}</b>.`
        }
    }[lang];

    const birthInput = document.getElementById("birthDate");
    if (!birthInput.value) {
        document.getElementById("result").textContent = copy.invalid;
        document.getElementById("result").style.display = "block";
        return;
    }

    const birthDate = new Date(birthInput.value)
    const deathDate = new Date(birthDate)
    deathDate.setFullYear(deathDate.getFullYear() + 90);
    const today = new Date();
    const diff = today - birthDate;
    const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
    const totalWeeks = Math.floor((deathDate - birthDate) / (1000 * 60 * 60 * 24 * 7));
    const weeksLeft = totalWeeks - weeks;
    const percentage = Math.floor((weeks / totalWeeks) * 100);
    document.getElementById("result").textContent = copy.result(weeksLeft);
    document.getElementById("summary").innerHTML = copy.summary(weeks, percentage, deathDate.getFullYear());
    birthInput.style.display = "none";
    document.getElementById("okbutton").style.display = "none";
    document.getElementById("birthdatetext").style.display = "none";
    document.getElementById("result").style.display = "block";
    document.getElementById("summary").style.display = "block";
    const grid = document.getElementById("weeks-grid");
    grid.innerHTML = "";
    grid.style.display = "grid";
    for (let i = 0; i < totalWeeks; i++) {
        const week = document.createElement("div");
        week.classList.add("week");
        if (i < weeks) {
            week.classList.add("passed");
        }
        grid.appendChild(week);
    }
}
