*** Settings ***
Documentation     Rock Paper Scissors — Smoke Tests (fast sanity check)
Resource          ../resources/common.resource
Resource          ../keywords/ui_keywords.resource
Resource          ../keywords/api_keywords.resource
Suite Setup       Setup API Session
Suite Teardown    Run Keywords    Teardown API Session    Close Browser    ALL

*** Test Cases ***
Backend Is Reachable
    [Tags]    smoke
    Health Check Should Pass

Frontend Loads
    [Tags]    smoke
    [Setup]    Open Game Page
    Verify Scores Visible

Can Play One Round
    [Tags]    smoke
    [Setup]    Open Game Page
    Play Round    rock
    Verify Result Banner Visible
