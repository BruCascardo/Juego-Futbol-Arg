import { TEAMS } from '../data/teams.js?v=2';

// --- Helpers ---
function createEl(tag, className, text = '') {
    const el = document.createElement(tag);
    if(className) el.className = className;
    if(text !== undefined && text !== null && text !== '') el.textContent = text;
    return el;
}

// --- Views ---

export const MainMenu = ({ onNewGame, onContinue, hasSave }) => {
    const container = createEl('div', 'screen');
    
    // Background decoration (optional, could be added via CSS)
    
    const content = createEl('div', 'main-menu-content');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.alignItems = 'center';
    content.style.zIndex = '2';

    const title = createEl('h1', 'title', 'FÚTBOL\nARGENTINO\nARCADE');
    title.style.whiteSpace = 'pre-line'; // Allow newlines
    title.style.textAlign = 'center';
    content.appendChild(title);

    const btnNew = createEl('button', 'btn', 'NUEVA CARRERA');
    btnNew.onclick = onNewGame;
    
    // Add icon or effect if needed
    content.appendChild(btnNew);

    if (hasSave) {
        const btnContinue = createEl('button', 'btn btn-secondary', 'CONTINUAR');
        btnContinue.onclick = onContinue;
        content.appendChild(btnContinue);
    }
    
    const footer = createEl('p', 'footer', 'v1.0.0 - Desarrollado por Antigravity');
    footer.style.marginTop = '40px';
    footer.style.opacity = '0.5';
    footer.style.fontSize = '0.9rem';
    content.appendChild(footer);

    container.appendChild(content);

    return container;
};

export const CareerSetup = ({ onStart }) => {
    const container = createEl('div', 'career-setup-container');
    
    // Helper to sort teams by RATING (descending)
    const getAllTeamsSorted = () => [...TEAMS].sort((a,b) => b.rating - a.rating);

    // State
    let step = 0; // 0: UserTeam, 1: LeagueA, 2: LeagueB
    let userTeamId = null;
    let leagueA_Ids = [];
    let leagueB_Ids = [];

    // Cached Elements for updates without re-renders
    let btnNextOrStart = null; 

    // Updates button state without re-rendering everything
    const updateButtonState = () => {
        if (!btnNextOrStart) return;

        if (step === 0) {
            btnNextOrStart.disabled = !userTeamId;
            btnNextOrStart.style.opacity = userTeamId ? '1' : '0.5';
            btnNextOrStart.textContent = 'Siguiente';
        } 
        else if (step === 1) {
            const count = leagueA_Ids.length;
            const remaining = 20 - count;
            if (count === 20) {
                btnNextOrStart.disabled = false;
                btnNextOrStart.style.opacity = '1';
                btnNextOrStart.textContent = 'Siguiente';
            } else {
                btnNextOrStart.disabled = true;
                btnNextOrStart.style.opacity = '0.5';
                btnNextOrStart.textContent = `Faltan ${remaining}`;
            }
        }
        else if (step === 2) {
            const count = leagueB_Ids.length;
            const remaining = 20 - count;
            const userIsSelected = leagueA_Ids.includes(userTeamId) || leagueB_Ids.includes(userTeamId);

            if (count !== 20) {
                btnNextOrStart.disabled = true;
                btnNextOrStart.style.opacity = '0.5';
                btnNextOrStart.textContent = `Faltan ${remaining}`;
                btnNextOrStart.style.backgroundColor = ''; 
            } else if (!userIsSelected) {
                btnNextOrStart.disabled = true;
                btnNextOrStart.style.opacity = '0.5';
                btnNextOrStart.style.backgroundColor = '#e74c3c'; // Red
                btnNextOrStart.textContent = 'TU EQUIPO NO FUE SELECCIONADO';
            } else {
                btnNextOrStart.disabled = false;
                btnNextOrStart.style.opacity = '1';
                btnNextOrStart.style.backgroundColor = '#2ecc71'; // Green (default primary)
                btnNextOrStart.textContent = 'INICIAR CARRERA';
            }
        }
    };

    const render = () => {
        container.innerHTML = '';
        btnNextOrStart = null; // Reset ref

        /* ---------------- STEP 0: SELECT USER TEAM ---------------- */
        if (step === 0) {
            const title = createEl('h2', 'setup-title', 'PASO 1: ELIGE TU EQUIPO');
            container.appendChild(title);
            
            const grid = createEl('div', 'team-grid');
            
            getAllTeamsSorted().forEach(team => {
                const card = createEl('div', 'team-card');
                if (team.id === userTeamId) card.classList.add('selected');
                
                const img = document.createElement('img');
                img.src = team.logo || '';
                const name = createEl('span', '', team.name);
                
                card.appendChild(img);
                card.appendChild(name);
                
                card.onclick = () => {
                    // Deselect others visually
                    Array.from(grid.children).forEach(c => c.classList.remove('selected'));
                    // Select this
                    card.classList.add('selected');
                    
                    userTeamId = team.id;
                    updateButtonState();
                };
                grid.appendChild(card);
            });
            container.appendChild(grid);
            
            // Footer
            const footer = createEl('div', 'setup-footer');
            btnNextOrStart = createEl('button', 'btn', 'Siguiente');
            btnNextOrStart.onclick = () => {
                if (userTeamId) {
                   step = 1;
                   render();
                }
            };
            updateButtonState();
            footer.appendChild(btnNextOrStart);
            container.appendChild(footer);
        }

        /* ---------------- STEP 1: SELECT LIGA PROFESIONAL (20) ---------------- */
        else if (step === 1) {
            // No count in title
            const title = createEl('h2', 'setup-title', 'PASO 2: LIGA PROFESIONAL');
            container.appendChild(title);
            
            const grid = createEl('div', 'team-grid');
            
            getAllTeamsSorted().forEach(team => {
                const card = createEl('div', 'team-card');
                if (leagueA_Ids.includes(team.id)) card.classList.add('selected');
                
                const img = document.createElement('img');
                img.src = team.logo || '';
                const name = createEl('span', '', team.name);
                
                card.appendChild(img);
                card.appendChild(name);
                
                card.onclick = () => {
                    if (leagueA_Ids.includes(team.id)) {
                        leagueA_Ids = leagueA_Ids.filter(id => id !== team.id);
                        card.classList.remove('selected');
                    } else {
                        if (leagueA_Ids.length < 20) {
                            leagueA_Ids.push(team.id);
                            card.classList.add('selected');
                        }
                    }
                    updateButtonState();
                };
                grid.appendChild(card);
            });
            container.appendChild(grid);

            // Footer
            const footer = createEl('div', 'setup-footer');
            btnNextOrStart = createEl('button', 'btn', 'Siguiente');
            btnNextOrStart.onclick = () => {
                if (leagueA_Ids.length === 20) {
                    step = 2;
                    render();
                }
            };
            updateButtonState();
            footer.appendChild(btnNextOrStart);
            container.appendChild(footer);
        }

        /* ---------------- STEP 2: SELECT PRIMERA NACIONAL (20) ---------------- */
        else if (step === 2) {
            // No count in title
            const title = createEl('h2', 'setup-title', 'PASO 3: PRIMERA NACIONAL');
            container.appendChild(title);

            const grid = createEl('div', 'team-grid');
            
            // Only show teams NOT in Liga A
            const availableTeams = getAllTeamsSorted().filter(t => !leagueA_Ids.includes(t.id));

            availableTeams.forEach(team => {
                const card = createEl('div', 'team-card');
                if (leagueB_Ids.includes(team.id)) card.classList.add('selected');
                
                const img = document.createElement('img');
                img.src = team.logo || '';
                const name = createEl('span', '', team.name);
                
                card.appendChild(img);
                card.appendChild(name);
                
                card.onclick = () => {
                     if (leagueB_Ids.includes(team.id)) {
                        leagueB_Ids = leagueB_Ids.filter(id => id !== team.id);
                        card.classList.remove('selected');
                    } else {
                        if (leagueB_Ids.length < 20) {
                            leagueB_Ids.push(team.id);
                            card.classList.add('selected');
                        }
                    }
                    updateButtonState();
                };
                grid.appendChild(card);
            });
            container.appendChild(grid);

            // Footer
            const footer = createEl('div', 'setup-footer');
            footer.style.flexDirection = 'column'; // Allow stacking
            footer.style.gap = '10px';

            // Checkbox Container
            const checkContainer = createEl('div', '', '');
            checkContainer.style.display = 'flex';
            checkContainer.style.alignItems = 'center';
            checkContainer.style.gap = '10px';
            checkContainer.style.marginBottom = '10px';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'realistic-check';
            checkbox.style.width = '20px';
            checkbox.style.height = '20px';
            
            const label = createEl('label', '', 'Resultados Realistas (Normalizar goleadas)');
            label.htmlFor = 'realistic-check';
            label.style.color = '#fff';
            label.style.cursor = 'pointer';

            checkContainer.appendChild(checkbox);
            checkContainer.appendChild(label);
            footer.appendChild(checkContainer);
            
            btnNextOrStart = createEl('button', 'btn', 'INICIAR CARRERA');
            btnNextOrStart.onclick = () => {
                const userIsSelected = leagueA_Ids.includes(userTeamId) || leagueB_Ids.includes(userTeamId);
                if (leagueB_Ids.length === 20 && userIsSelected) {
                    onStart(userTeamId, leagueA_Ids, leagueB_Ids, checkbox.checked);
                }
            };
            
            updateButtonState();
            
            footer.appendChild(btnNextOrStart);
            container.appendChild(footer);
        }
    };

    // Initial Render
    render();

    return container;
};

export const Dashboard = ({ team, leagueA, leagueB, nextMatch, onPlayMatch, onNextWeek, onShowFixture, currentSeason }) => {
    const container = createEl('div', 'screen dashboard-container');

    // --- LEFT SIDE: Standings ---
    const leftPanel = createEl('div', 'dashboard-left');
    
    // Header Wrapper for custom dropdown logic
    const headerWrapper = createEl('div', 'league-header');
    const headerTitle = createEl('h3', '', ''); // Set initially
    const headerArrow = createEl('span', 'arrow', '▼');
    headerWrapper.appendChild(headerTitle);
    headerWrapper.appendChild(headerArrow);

    const dropdown = createEl('div', 'league-dropdown');
    const optionA = createEl('div', 'league-option', leagueA.name);
    const optionB = createEl('div', 'league-option', leagueB.name);
    dropdown.appendChild(optionA);
    dropdown.appendChild(optionB);

    headerWrapper.appendChild(dropdown);
    leftPanel.appendChild(headerWrapper);

    // Table Container (Scrollable)
    const tableContainer = createEl('div', 'table-scroll-area');
    leftPanel.appendChild(tableContainer);

    // Logic for Switching
    // Default to Team's League
    let currentLeague = leagueA.teams.find(t => t.id === team.id) ? leagueA : leagueB;
    
    const renderContent = () => {
        headerTitle.textContent = currentLeague.name;
        tableContainer.innerHTML = '';
        tableContainer.innerHTML = '';
        tableContainer.appendChild(renderTableContent(currentLeague, team.id)); // Pass userTeamId
    };

    // Toggle Dropdown
    headerWrapper.onclick = (e) => {
        // Prevent closing when clicking options instantly
        e.stopPropagation();
        dropdown.classList.toggle('show');
        headerWrapper.classList.toggle('active');
    };
    
    // Close dropdown on outside click
    window.onclick = () => {
        dropdown.classList.remove('show');
        headerWrapper.classList.remove('active');
    };

    optionA.onclick = () => {
        currentLeague = leagueA;
        renderContent();
    };

    optionB.onclick = () => {
        currentLeague = leagueB;
        renderContent();
    };

    renderContent(); // Initial render
    container.appendChild(leftPanel);

    // --- RIGHT SIDE: Match Info / Fixture ---
    const rightPanel = createEl('div', 'dashboard-right');

    // UI Structure for Right Panel
    // We will re-render rightPanel content based on mode
    let viewMode = 'MATCH'; // 'MATCH' or 'FIXTURE'

    const renderRightPanel = () => {
        rightPanel.innerHTML = '';

        if (viewMode === 'MATCH') {
            const teamHeader = createEl('h2', '', `${team.name}`);
            teamHeader.style.fontSize = '3rem';
            rightPanel.appendChild(teamHeader);
            
            const seasonInfo = createEl('p', '', `Temporada ${currentSeason}`);
            seasonInfo.style.marginBottom = '30px';
            rightPanel.appendChild(seasonInfo);

            if (nextMatch) {
                 // Determine League for nextMatch to get positions
                 // Both teams should be in the same league.
                 const matchLeague = leagueA.teams.find(t => t.id === nextMatch.home.id) ? leagueA : leagueB;
                 
                 const getRank = (teamId) => {
                     const sorted = matchLeague.getStandingsArray();
                     return sorted.findIndex(s => s.team.id === teamId) + 1;
                 };
        
                 const homeRank = getRank(nextMatch.home.id);
                 const awayRank = getRank(nextMatch.away.id);
                 
                 const card = createEl('div', 'match-card');
                 // Reset default match-card padding/layout if needed, but we'll use inner flex
                 card.style.display = 'flex';
                 card.style.flexDirection = 'column';
                 card.style.alignItems = 'center';
                 
                 const title = createEl('h3', '', 'PRÓXIMO PARTIDO');
                 title.style.marginBottom = '20px';
                 card.appendChild(title);
        
                 const content = createEl('div', 'match-vs-container');
                 content.style.display = 'flex';
                 content.style.justifyContent = 'space-around';
                 content.style.alignItems = 'center';
                 content.style.width = '100%';
        
                 // HOME
                 const homeDiv = createEl('div', '', '');
                 homeDiv.style.display = 'flex';
                 homeDiv.style.flexDirection = 'column';
                 homeDiv.style.alignItems = 'center';
                 homeDiv.style.width = '35%';
        
                 const imgHome = document.createElement('img');
                 imgHome.src = nextMatch.home.logo || '';
                 imgHome.style.width = '80px';
                 imgHome.style.height = '80px';
                 imgHome.style.objectFit = 'contain';
                 imgHome.style.marginBottom = '10px';
                 
                 const nameHome = createEl('h2', '', nextMatch.home.name);
                 nameHome.style.fontSize = '1.2rem';
                 nameHome.style.textAlign = 'center';
                 nameHome.style.textShadow = 'none';
                 nameHome.style.color = '#fff';
                 
                 const posHome = createEl('span', '', `${homeRank}°`);
                 posHome.style.color = '#aaa';
                 posHome.style.marginTop = '5px';
        
                 homeDiv.appendChild(imgHome);
                 homeDiv.appendChild(nameHome);
                 homeDiv.appendChild(posHome);
        
                 // VS
                 const vsDiv = createEl('div', 'versus', 'VS');
                 vsDiv.style.margin = '0';
        
                 // AWAY
                 const awayDiv = createEl('div', '', '');
                 awayDiv.style.display = 'flex';
                 awayDiv.style.flexDirection = 'column';
                 awayDiv.style.alignItems = 'center';
                 awayDiv.style.width = '35%';
        
                 const imgAway = document.createElement('img');
                 imgAway.src = nextMatch.away.logo || '';
                 imgAway.style.width = '80px';
                 imgAway.style.height = '80px';
                 imgAway.style.objectFit = 'contain';
                 imgAway.style.marginBottom = '10px';
                 
                 const nameAway = createEl('h2', '', nextMatch.away.name);
                 nameAway.style.fontSize = '1.2rem';
                 nameAway.style.textAlign = 'center';
                 nameAway.style.textShadow = 'none';
                 nameAway.style.color = '#fff';
                 
                 const posAway = createEl('span', '', `${awayRank}°`);
                 posAway.style.color = '#aaa';
                 posAway.style.marginTop = '5px';
        
                 awayDiv.appendChild(imgAway);
                 awayDiv.appendChild(nameAway);
                 awayDiv.appendChild(posAway);
        
                 content.appendChild(homeDiv);
                 content.appendChild(vsDiv);
                 content.appendChild(awayDiv);
        
                 card.appendChild(content);
                 rightPanel.appendChild(card);
                 
                 const btnPlay = createEl('button', 'btn', 'JUGAR');
                 btnPlay.onclick = onPlayMatch;
                 rightPanel.appendChild(btnPlay);
        
                 // FIXTURE BUTTON to Toggle View
                 const btnFixture = createEl('button', 'btn btn-secondary', 'VER FIXTURE');
                 btnFixture.style.marginTop = '10px';
                 btnFixture.onclick = () => {
                     viewMode = 'FIXTURE';
                     renderRightPanel();
                 };
                 rightPanel.appendChild(btnFixture);

            } else {
                const info = createEl('div', 'info', 'TEMPORADA FINALIZADA');
                info.style.fontSize = '2rem';
                info.style.marginBottom = '30px';
                rightPanel.appendChild(info);
                
                const btnNext = createEl('button', 'btn', 'SIGUIENTE TEMP.');
                btnNext.onclick = onNextWeek; 
                rightPanel.appendChild(btnNext);
            }

        } else if (viewMode === 'FIXTURE') {
            // --- FIXTURE VIEW (Embedded) ---
            
            // Re-use logic for fixture creation but cleaner fit
            
            const fixtureBox = createEl('div', 'fixture-container');
            // Styles handled by CSS class now
            fixtureBox.style.background = 'transparent'; // Override default if needed
            fixtureBox.style.border = 'none';
            
            // Header
            const header = createEl('div', 'fixture-header');
            const title = createEl('h3', '', `FIXTURE - ${currentLeague.name}`);
            title.style.margin = '10px 0';
            header.appendChild(title);

            // Round Selector
            const selectorContainer = createEl('div', 'round-selector-container');
            const prevBtn = createEl('button', 'btn btn-secondary', '<');
            prevBtn.style.padding = '5px 10px';
            
            const nextBtn = createEl('button', 'btn btn-secondary', '>');
            nextBtn.style.padding = '5px 10px';

            const select = document.createElement('select');
            select.className = 'round-selector';
            
            // Populate select
            currentLeague.schedule.forEach((_, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.text = `Fecha ${index + 1}`;
                select.appendChild(option);
            });

            // Default to current round
            // State needs to be persistent if switching views? Maybe not.
            // Let's default to current round index.
            let currentRoundIdx = currentLeague.currentRoundIndex < currentLeague.schedule.length ? currentLeague.currentRoundIndex : currentLeague.schedule.length - 1;
            select.value = currentRoundIdx;

            selectorContainer.appendChild(prevBtn);
            selectorContainer.appendChild(select);
            selectorContainer.appendChild(nextBtn);
            header.appendChild(selectorContainer);
            fixtureBox.appendChild(header);

            // Matches Area
            const matchesArea = createEl('div', 'fixture-table-area');
            // matchesArea.style.height = '400px'; // Limit height for scrolling
            fixtureBox.appendChild(matchesArea);

            const renderRound = (roundIndex) => {
                matchesArea.innerHTML = '';
                const roundMatches = currentLeague.schedule[roundIndex];
                
                if (!roundMatches) return;

                roundMatches.forEach(match => {
                    const row = createEl('div', 'fixture-match-row');
                    
                    if (match.home.id === team.id || match.away.id === team.id) {
                        row.classList.add('highlight');
                    }

                    // HOME
                    const homeCell = createEl('div', 'team-cell home');
                    const homeLogo = document.createElement('img');
                    homeLogo.className = 'logo-small';
                    homeLogo.src = match.home.logo || '';
                    const homeName = createEl('span', '', match.home.name);
                    homeCell.appendChild(homeLogo);
                    homeCell.appendChild(homeName);

                    // SCORE
                    const scoreContainer = createEl('div', 'score-container');
                    scoreContainer.style.display = 'flex';
                    scoreContainer.style.alignItems = 'center';
                    scoreContainer.style.justifyContent = 'center';
                    scoreContainer.style.minWidth = '120px';

                    if (match.played) {
                        // FIX: Explicitly check for current league/match data or just display
                        // createEl helper bugfix: ensure 0 is displayed
                        const scoreHome = createEl('div', 'score-box', String(match.scoreHome));
                        const scoreAway = createEl('div', 'score-box', String(match.scoreAway));
                        scoreContainer.appendChild(scoreHome);
                        scoreContainer.appendChild(createEl('span', '', '-'));
                        scoreContainer.appendChild(scoreAway);
                    } else {
                        const pending = createEl('div', 'score-box pending-box', 'VS');
                        scoreContainer.appendChild(pending);
                    }

                    // AWAY
                    const awayCell = createEl('div', 'team-cell away');
                    const awayLogo = document.createElement('img');
                    awayLogo.className = 'logo-small';
                    awayLogo.src = match.away.logo || '';
                    const awayName = createEl('span', '', match.away.name);
                    awayCell.appendChild(awayLogo);
                    awayCell.appendChild(awayName);

                    row.appendChild(homeCell);
                    row.appendChild(scoreContainer);
                    row.appendChild(awayCell);

                    matchesArea.appendChild(row);
                });
            };

            // Events
            select.onchange = (e) => {
                currentRoundIdx = parseInt(e.target.value);
                renderRound(currentRoundIdx);
            };

            prevBtn.onclick = () => {
                if (currentRoundIdx > 0) {
                    currentRoundIdx--;
                    select.value = currentRoundIdx;
                    renderRound(currentRoundIdx);
                }
            };

            nextBtn.onclick = () => {
                if (currentRoundIdx < currentLeague.schedule.length - 1) {
                    currentRoundIdx++;
                    select.value = currentRoundIdx;
                    renderRound(currentRoundIdx);
                }
            };

            // Initial Round Render
            renderRound(currentRoundIdx);

            rightPanel.appendChild(fixtureBox);
            
            // Back Button
            const btnBack = createEl('button', 'btn btn-secondary', 'VOLVER AL PARTIDO');
            btnBack.style.marginTop = '15px';
            btnBack.style.padding = '10px 20px';
            btnBack.style.fontSize = '1.2rem';
            btnBack.onclick = () => {
                viewMode = 'MATCH';
                renderRightPanel();
            };
            rightPanel.appendChild(btnBack);
        }
    };

    renderRightPanel();
    container.appendChild(rightPanel);

    return container;
};

// Internal helper for just table content
function renderTableContent(league, userTeamId) {
    const table = document.createElement('table');
    table.style.width = '100%'; 
    table.style.borderCollapse = 'collapse';
    
    // Header
    table.innerHTML = `
        <tr style="border-bottom: 2px solid rgba(255,255,255,0.1)">
            <th style="width: 30px;">Pos</th>
            <th style="width: auto;">Club</th>
            <th style="width: 50px; font-size: 1.1rem;">Pts</th>
            <th style="width: 40px;">PJ</th>
            <th style="width: 40px;">DG</th>
        </tr>
    `;
    
    const standings = league.getStandingsArray();
    standings.forEach((row, index) => {
        const tr = document.createElement('tr');
        let logoURL = `./img/equipos/logo_${row.team.id}.png`;
        
        let color = '#ffffff'; // Default white
        let textShadow = 'none';
        let fontWeight = 'normal';

        // Logic for Colors
        if (index === 0) {
            // Champion / Leader -> Gold
            color = '#ffd700';
            textShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
            fontWeight = 'bold';
        } else {
            // Specific League Rules
            if (league.level === 1) { // Liga Profesional
                // Relegation (Last 3)
                if (index >= standings.length - 3) color = '#e74c3c'; // Red (Relegation last 3)
            } else if (league.level === 2) { // Primera Nacional
                // Promotion (2nd and 3rd, since 1st is Gold)
                if (index <= 2) color = '#2ecc71'; // Green
            }
        }
        
        tr.style.color = color;
        tr.style.textShadow = textShadow;
        tr.style.color = color;
        tr.style.textShadow = textShadow;
        tr.style.fontWeight = fontWeight;

        // Highlight User Team
        if (row.team.id === userTeamId) {
            tr.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            tr.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        }

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td style="padding: 0;">
                <div style="display: flex; align-items: center; padding-left: 5px;">
                    <img src="${logoURL}" style="width: 24px; height: 24px; object-fit: contain; margin-right: 8px;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">${row.team.name}</span>
                </div>
            </td>
            <td style="font-weight: bold; font-size: 1.1rem; vertical-align: middle;">${row.points}</td>
            <td style="vertical-align: middle;">${row.played}</td>
            <td style="vertical-align: middle;">${row.gd}</td>
        `;

        table.appendChild(tr);
    });

    return table;
}

export const MatchResults = ({ homeScore, awayScore, homeTeam, awayTeam, onContinue }) => {
    const container = createEl('div', 'screen');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.background = 'linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)'; // Victory-like background

    const title = createEl('h1', 'result-title', 'FINAL DEL PARTIDO');
    title.style.marginBottom = '40px';
    title.style.fontSize = '3rem';
    title.style.textShadow = '0 0 20px rgba(0,0,0,0.8)';
    container.appendChild(title);

    const resultCard = createEl('div', 'result-card');
    resultCard.style.display = 'flex';
    resultCard.style.alignItems = 'center';
    resultCard.style.justifyContent = 'space-around';
    resultCard.style.width = '80%';
    resultCard.style.maxWidth = '800px';
    resultCard.style.backgroundColor = 'rgba(0,0,0,0.6)';
    resultCard.style.padding = '40px';
    resultCard.style.borderRadius = '20px';
    resultCard.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    resultCard.style.marginBottom = '50px';

    // Helper to create team column
    const createTeamCol = (team, score, align) => {
        const col = createEl('div');
        col.style.display = 'flex';
        col.style.flexDirection = 'column';
        col.style.alignItems = 'center';
        col.style.flex = '1';

        const img = document.createElement('img');
        img.src = team.logo || '';
        img.style.width = '120px';
        img.style.height = '120px';
        img.style.objectFit = 'contain';
        img.style.marginBottom = '20px';

        const name = createEl('h2', '', team.name);
        name.style.fontSize = '1.5rem';
        name.style.textAlign = 'center';
        
        col.appendChild(img);
        col.appendChild(name);
        return col;
    };

    const homeCol = createTeamCol(homeTeam, homeScore, 'right');
    const awayCol = createTeamCol(awayTeam, awayScore, 'left');

    const scoreDisplay = createEl('div', '', `${homeScore} - ${awayScore}`);
    scoreDisplay.style.fontSize = '5rem';
    scoreDisplay.style.fontWeight = 'bold';
    scoreDisplay.style.margin = '0 40px';
    scoreDisplay.style.fontFamily = "'Teko', sans-serif";
    scoreDisplay.style.textShadow = '0 0 10px rgba(255,255,255,0.5)';

    resultCard.appendChild(homeCol);
    resultCard.appendChild(scoreDisplay);
    resultCard.appendChild(awayCol);
    
    container.appendChild(resultCard);
    
    const btn = createEl('button', 'btn', 'CONTINUAR');
    btn.onclick = onContinue;
    btn.style.padding = '15px 40px';
    btn.style.fontSize = '1.5rem';
    container.appendChild(btn);
    
    return container;
};
