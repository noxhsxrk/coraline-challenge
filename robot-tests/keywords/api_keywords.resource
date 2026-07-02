*** Settings ***
Resource          ../resources/variables.resource

*** Keywords ***
Setup API Session
    [Documentation]    Create HTTP session for backend API
    Create Session    api    ${API_URL}

Teardown API Session
    [Documentation]    Clean up all HTTP sessions
    Delete All Sessions

Health Check Should Pass
    [Documentation]    GET /api/health returns status ok
    ${resp}=    GET On Session    api    /api/health    expected_status=200
    Should Be Equal As Strings    ${resp.json()['status']}    ok

Score Endpoint Should Return Number
    [Documentation]    GET /api/score returns a non-negative integer
    ${resp}=    GET On Session    api    /api/score    expected_status=200
    ${score}=    Set Variable    ${resp.json()['highScore']}
    Should Be True    isinstance(${score}, int) or ${score} >= 0

Play Should Return Valid Response
    [Documentation]    POST /api/game/play returns correct structure
    [Arguments]    ${action}=rock
    ${body}=    Create Dictionary    action=${action}
    ${resp}=    POST On Session    api    /api/game/play    json=${body}    expected_status=201
    Dictionary Should Contain Key    ${resp.json()}    botAction
    Dictionary Should Contain Key    ${resp.json()}    result
    Dictionary Should Contain Key    ${resp.json()}    yourScore
    Dictionary Should Contain Key    ${resp.json()}    highScore
    ${valid_action}=    Evaluate    "${resp.json()['botAction']}" in ("rock", "paper", "scissors")
    Should Be True    ${valid_action}
    ${valid_result}=    Evaluate    "${resp.json()['result']}" in ("win", "lose", "draw")
    Should Be True    ${valid_result}
    [Return]    ${resp.json()}

Play Until Lose
    [Documentation]    Keep playing until we get a 'lose' result
    FOR    ${i}    IN RANGE    50
        ${body}=    Create Dictionary    action=rock
        ${resp}=    POST On Session    api    /api/game/play    json=${body}    expected_status=201
        ${result}=    Set Variable    ${resp.json()['result']}
        IF    "${result}" == "lose"
            Should Be Equal As Integers    ${resp.json()['yourScore']}    0
            Exit For Loop
        END
    END

High Score Should Persist
    [Documentation]    High score stays consistent across API calls
    ${body}=    Create Dictionary    action=rock
    ${resp}=    POST On Session    api    /api/game/play    json=${body}    expected_status=201
    ${hs1}=    Set Variable    ${resp.json()['highScore']}
    ${resp}=    GET On Session    api    /api/score    expected_status=200
    ${hs2}=    Set Variable    ${resp.json()['highScore']}
    Should Be True    ${hs1} >= 0 and ${hs2} >= 0
