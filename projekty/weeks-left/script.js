function calculateWeeksLeft() {
    const birthDate = new Date(document.getElementById("birthDate").value)
    const deathDate = new Date(birthDate)
    deathDate.setFullYear(deathDate.getFullYear() + 90);
    const today = new Date();
    const diff = today - birthDate;
    const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
    const totalWeeks = Math.floor((deathDate - birthDate) / (1000 * 60 * 60 * 24 * 7));
    const weeksLeft = totalWeeks - weeks;
    const percentage = Math.floor((weeks / totalWeeks) * 100);
    document.getElementById("result").textContent = weeksLeft + " weeks left";
    document.getElementById("summary").innerHTML = `You have lived through <b>${weeks}</b> weeks of your life, that's <b>${percentage}%</b>.<br>If you live to 90, you'll die in <b>${deathDate.getFullYear()}</b>.`;
    document.getElementById("birthDate").style.display = "none";
    document.getElementById("okbutton").style.display = "none";
    document.getElementById("birthdatetext").style.display = "none";
    document.getElementById("result").style.display = "block";
    document.getElementById("summary").style.display = "block";
    document.getElementById("weeks-grid").style.display = "grid";
    for (let i = 0; i < totalWeeks; i++) {
        const week = document.createElement("div");
        week.classList.add("week");
        if (i < weeks) {
            week.classList.add("passed");
        }
        document.getElementById("weeks-grid").appendChild(week);
    }
}