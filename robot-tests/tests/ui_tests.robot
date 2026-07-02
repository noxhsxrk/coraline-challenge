*** Settings ***
Documentation     Rock Paper Scissors — UI Tests
Resource          ../resources/common.resource
Resource          ../keywords/ui_keywords.resource
Test Setup        Open Game Page
Test Teardown     Close Game

*** Test Cases ***
Page Loads With Initial Scores
    [Tags]    smoke    ui
    Verify Scores Visible
    Take Screenshot    initial_load

All Three Action Buttons Are Visible
    [Tags]    ui
    Verify Buttons Present

Buttons Disabled After Click
    [Tags]    ui    gameflow
    Click    [data-testid="btn-rock"]
    Verify Buttons Locked

Buttons Re-enable After Reveal
    [Tags]    ui    gameflow
    Click    [data-testid="btn-rock"]
    Sleep    ${REVEAL_WAIT}
    Verify Buttons Unlocked

Result Banner Appears After Round
    [Tags]    ui    gameflow
    Click    [data-testid="btn-rock"]
    Sleep    ${REVEAL_WAIT}
    Verify Result Banner Visible

Can Play Multiple Rounds
    [Tags]    ui    gameflow
    Play Round    rock
    Play Round    paper
    Play Round    scissors

Mobile Viewport Renders Correctly
    [Tags]    responsive    ui
    Take Screenshot    mobile_viewport
    Verify Buttons Present
    ${rock}=    Get BoundingBox    [data-testid="btn-rock"]
    Should Be True    ${rock['x']} >= 0
    Should Be True    ${rock['y']} >= 0

Desktop Viewport Layout Check
    [Tags]    responsive    ui
    [Setup]    Open Game Page Desktop
    Take Screenshot    desktop_viewport
    Verify Buttons Present
