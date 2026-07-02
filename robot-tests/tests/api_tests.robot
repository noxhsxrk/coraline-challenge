*** Settings ***
Documentation     Rock Paper Scissors — API Tests
Resource          ../resources/common.resource
Resource          ../keywords/api_keywords.resource
Suite Setup       Setup API Session
Suite Teardown    Teardown API Session

*** Test Cases ***
Health Check Returns OK
    [Tags]    smoke    api
    Health Check Should Pass

Score Endpoint Returns Number
    [Tags]    api
    Score Endpoint Should Return Number

Play Returns Valid Response For Rock
    [Tags]    api
    Play Should Return Valid Response    rock    0

Play Returns Valid Response For Paper
    [Tags]    api
    Play Should Return Valid Response    paper    5

Play Returns Valid Response For Scissors
    [Tags]    api
    Play Should Return Valid Response    scissors    10

Losing Resets Score To Zero
    [Tags]    api    logic
    Play Until Lose

High Score Persists Across Requests
    [Tags]    api    logic
    High Score Should Persist
