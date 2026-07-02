*** Settings ***
Resource          ../resources/variables.resource

*** Keywords ***
Open Game Page
    [Documentation]    Launch browser and navigate to the game
    New Browser    ${BROWSER}    headless=${HEADLESS}
    New Context    viewport={'width': 390, 'height': 844}    deviceScaleFactor=2
    New Page       ${BASE_URL}
    Wait For Elements State    [data-testid="btn-rock"]    visible    timeout=${TIMEOUT}

Open Game Page Desktop
    [Documentation]    Launch browser at desktop viewport
    New Browser    ${BROWSER}    headless=${HEADLESS}
    New Context    viewport={'width': 1440, 'height': 900}
    New Page       ${BASE_URL}
    Wait For Elements State    [data-testid="btn-rock"]    visible    timeout=${TIMEOUT}

Close Game
    [Documentation]    Close all browser contexts
    Close Browser    ALL

Play Round
    [Documentation]    Click an action and wait for the 2-second reveal to complete
    [Arguments]    ${action}
    Wait For Elements State    [data-testid="btn-${action}"]    enabled    timeout=${TIMEOUT}
    Click    [data-testid="btn-${action}"]
    Sleep    ${REVEAL_WAIT}

Verify Scores Visible
    [Documentation]    Both score displays should contain numbers
    Get Text    [data-testid="your-score"]    contains    0
    Get Text    [data-testid="high-score"]    contains    0

Verify Buttons Present
    [Documentation]    All three action buttons are on screen
    Get Element State    [data-testid="btn-rock"]       contains    visible
    Get Element State    [data-testid="btn-paper"]      contains    visible
    Get Element State    [data-testid="btn-scissors"]   contains    visible

Verify Buttons Locked
    [Documentation]    All buttons must be disabled
    Wait For Elements State    [data-testid="btn-rock"]       disabled
    Wait For Elements State    [data-testid="btn-paper"]      disabled
    Wait For Elements State    [data-testid="btn-scissors"]   disabled

Verify Buttons Unlocked
    [Documentation]    All buttons must be enabled
    Get Element State    [data-testid="btn-rock"]    contains    enabled

Verify Result Banner Visible
    [Documentation]    Result banner is shown after round resolves
    Get Element State    [data-testid="result-banner"]    contains    visible

Take Screenshot
    [Documentation]    Capture screenshot with given name
    [Arguments]    ${name}
    Take Screenshot    filename=screenshots/${name}.png
