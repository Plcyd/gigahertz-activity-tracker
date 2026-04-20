-- =========================================================================
-- GIGAHERTZ NEXUS: LÖVE EDITION (main.lua)
-- =========================================================================

-- System State
local AppState = {
    current = "login", -- "login" or "dashboard"
    sessionTimer = 0,
    activeTaskTimer = 0,
    isTaskActive = false,
    productivity = 0,
    tasksLogged = 0,
    empIdInput = "",
    passwordInput = "",
    activeField = "empId", -- "empId" or "password"
    loginError = "",
    theme = {
        bg = {15/255, 23/255, 42/255},       -- Dark Slate
        card = {30/255, 41/255, 59/255, 0.8},-- Glass Card
        primary = {59/255, 130/255, 246/255},-- Blue
        text = {248/255, 250/255, 252/255},  -- White
        textMuted = {148/255, 163/255, 184/255},
        danger = {239/255, 68/255, 68/255},
        success = {34/255, 197/255, 94/255}
    }
}

-- Fonts
local fonts = {}

function love.load()
    love.window.setTitle("Gigahertz Nexus - LÖVE Edition")
    love.window.setMode(1024, 768, {resizable = false})
    love.keyboard.setKeyRepeat(true)
    
    -- Using default fonts, scaled up
    fonts.title = love.graphics.setNewFont(32)
    fonts.heading = love.graphics.setNewFont(24)
    fonts.body = love.graphics.setNewFont(16)
    fonts.small = love.graphics.setNewFont(12)
end

function love.update(dt)
    if AppState.current == "dashboard" then
        AppState.sessionTimer = AppState.sessionTimer + dt
        
        if AppState.isTaskActive then
            AppState.activeTaskTimer = AppState.activeTaskTimer + dt
        end
        
        if AppState.sessionTimer > 0 then
            AppState.productivity = math.min(100, math.floor((AppState.activeTaskTimer / AppState.sessionTimer) * 100))
        end
    end
end

-- Utility: Format Time
local function formatTime(seconds)
    local h = math.floor(seconds / 3600)
    local m = math.floor((seconds % 3600) / 60)
    local s = math.floor(seconds % 60)
    return string.format("%02d:%02d:%02d", h, m, s)
end

-- Utility: Draw Rounded Rectangle
local function drawRoundedRect(mode, x, y, w, h, rx, ry)
    love.graphics.rectangle(mode, x, y, w, h, rx, ry)
end

-- =========================================================================
-- DRAWING LOGIC
-- =========================================================================

function love.draw()
    -- Draw Background
    love.graphics.clear(AppState.theme.bg)
    
    if AppState.current == "login" then
        drawLoginScreen()
    elseif AppState.current == "dashboard" then
        drawDashboardScreen()
    end
end

function drawLoginScreen()
    local cx, cy = love.graphics.getWidth() / 2, love.graphics.getHeight() / 2
    local cw, ch = 400, 450
    local sx, sy = cx - cw/2, cy - ch/2

    -- Card Background
    love.graphics.setColor(AppState.theme.card)
    drawRoundedRect("fill", sx, sy, cw, ch, 16, 16)
    love.graphics.setColor(1, 1, 1, 0.1)
    drawRoundedRect("line", sx, sy, cw, ch, 16, 16)

    -- Title
    love.graphics.setColor(AppState.theme.text)
    love.graphics.setFont(fonts.title)
    love.graphics.printf("Nexus Login", sx, sy + 40, cw, "center")

    -- Error Message
    if AppState.loginError ~= "" then
        love.graphics.setColor(AppState.theme.danger)
        love.graphics.setFont(fonts.small)
        love.graphics.printf(AppState.loginError, sx, sy + 90, cw, "center")
    end

    -- Employee ID Field
    love.graphics.setColor(AppState.theme.textMuted)
    love.graphics.setFont(fonts.small)
    love.graphics.print("EMPLOYEE ID (GHZ-####)", sx + 40, sy + 130)
    
    if AppState.activeField == "empId" then
        love.graphics.setColor(AppState.theme.primary)
    else
        love.graphics.setColor(0, 0, 0, 0.3)
    end
    drawRoundedRect("fill", sx + 40, sy + 150, cw - 80, 40, 8, 8)
    
    love.graphics.setColor(AppState.theme.text)
    love.graphics.setFont(fonts.body)
    love.graphics.print(AppState.empIdInput .. (AppState.activeField == "empId" and "_" or ""), sx + 50, sy + 160)

    -- Password Field
    love.graphics.setColor(AppState.theme.textMuted)
    love.graphics.setFont(fonts.small)
    love.graphics.print("PASSWORD", sx + 40, sy + 210)
    
    if AppState.activeField == "password" then
        love.graphics.setColor(AppState.theme.primary)
    else
        love.graphics.setColor(0, 0, 0, 0.3)
    end
    drawRoundedRect("fill", sx + 40, sy + 230, cw - 80, 40, 8, 8)
    
    love.graphics.setColor(AppState.theme.text)
    love.graphics.setFont(fonts.body)
    love.graphics.print(string.rep("*", #AppState.passwordInput) .. (AppState.activeField == "password" and "_" or ""), sx + 50, sy + 240)

    -- Login Button
    love.graphics.setColor(AppState.theme.primary)
    drawRoundedRect("fill", sx + 40, sy + 320, cw - 80, 50, 8, 8)
    love.graphics.setColor(1, 1, 1)
    love.graphics.setFont(fonts.heading)
    love.graphics.printf("ENTER", sx, sy + 330, cw, "center")
end

function drawDashboardScreen()
    -- Header
    love.graphics.setColor(AppState.theme.card)
    love.graphics.rectangle("fill", 0, 0, 1024, 80)
    love.graphics.setColor(AppState.theme.text)
    love.graphics.setFont(fonts.title)
    love.graphics.print("Dashboard | User: " .. AppState.empIdInput, 30, 20)

    -- Logout Button
    love.graphics.setColor(AppState.theme.danger)
    drawRoundedRect("fill", 900, 20, 90, 40, 8, 8)
    love.graphics.setColor(1, 1, 1)
    love.graphics.setFont(fonts.body)
    love.graphics.printf("Logout", 900, 30, 90, "center")

    -- Stats Grid
    drawStatCard(30, 110, "Session Time", formatTime(AppState.sessionTimer), AppState.theme.primary)
    drawStatCard(360, 110, "Productivity", AppState.productivity .. "%", AppState.theme.success)
    drawStatCard(690, 110, "Tasks Logged", tostring(AppState.tasksLogged), AppState.theme.warn)

    -- Tracker Section
    love.graphics.setColor(AppState.theme.card)
    drawRoundedRect("fill", 30, 260, 960, 300, 16, 16)
    
    love.graphics.setColor(AppState.theme.text)
    love.graphics.setFont(fonts.heading)
    love.graphics.printf(AppState.isTaskActive and "🔴 LIVE TIMER RUNNING" or "⏱ READY TO TRACK", 30, 290, 960, "center")

    love.graphics.setFont(love.graphics.setNewFont(80))
    love.graphics.setColor(AppState.theme.primary)
    love.graphics.printf(formatTime(AppState.activeTaskTimer), 30, 350, 960, "center")

    -- Start/Stop Button
    local btnColor = AppState.isTaskActive and AppState.theme.danger or AppState.theme.success
    local btnText = AppState.isTaskActive and "STOP & SAVE TASK" or "START NEW TASK"
    love.graphics.setColor(btnColor)
    drawRoundedRect("fill", 360, 480, 300, 50, 8, 8)
    love.graphics.setColor(1, 1, 1)
    love.graphics.setFont(fonts.heading)
    love.graphics.printf(btnText, 360, 490, 300, "center")
end

function drawStatCard(x, y, title, value, color)
    love.graphics.setColor(AppState.theme.card)
    drawRoundedRect("fill", x, y, 300, 120, 12, 12)
    
    love.graphics.setColor(AppState.theme.textMuted)
    love.graphics.setFont(fonts.body)
    love.graphics.print(title, x + 20, y + 20)
    
    love.graphics.setColor(color)
    love.graphics.setFont(love.graphics.setNewFont(48))
    love.graphics.print(value, x + 20, y + 50)
end

-- =========================================================================
-- INPUT HANDLING
-- =========================================================================

function love.mousepressed(x, y, button, istouch, presses)
    if button == 1 then
        if AppState.current == "login" then
            local cx, cy = love.graphics.getWidth() / 2, love.graphics.getHeight() / 2
            local sx, sy = cx - 200, cy - 225

            -- Check Emp ID Field
            if x > sx + 40 and x < sx + 360 and y > sy + 150 and y < sy + 190 then
                AppState.activeField = "empId"
            -- Check Password Field
            elseif x > sx + 40 and x < sx + 360 and y > sy + 230 and y < sy + 270 then
                AppState.activeField = "password"
            -- Check Login Button
            elseif x > sx + 40 and x < sx + 360 and y > sy + 320 and y < sy + 370 then
                attemptLogin()
            end
        elseif AppState.current == "dashboard" then
            -- Start/Stop Button
            if x > 360 and x < 660 and y > 480 and y < 530 then
                if AppState.isTaskActive then
                    -- Stop Task
                    AppState.isTaskActive = false
                    AppState.tasksLogged = AppState.tasksLogged + 1
                else
                    -- Start Task
                    AppState.isTaskActive = true
                end
            -- Logout Button
            elseif x > 900 and x < 990 and y > 20 and y < 60 then
                AppState.current = "login"
                AppState.sessionTimer = 0
                AppState.activeTaskTimer = 0
                AppState.isTaskActive = false
                AppState.tasksLogged = 0
            end
        end
    end
end

function love.keypressed(key)
    if AppState.current == "login" then
        if key == "backspace" then
            if AppState.activeField == "empId" then
                AppState.empIdInput = string.sub(AppState.empIdInput, 1, -2)
            elseif AppState.activeField == "password" then
                AppState.passwordInput = string.sub(AppState.passwordInput, 1, -2)
            end
        elseif key == "tab" then
            AppState.activeField = AppState.activeField == "empId" and "password" or "empId"
        elseif key == "return" then
            attemptLogin()
        end
    end
end

function love.textinput(t)
    if AppState.current == "login" then
        if AppState.activeField == "empId" and #AppState.empIdInput < 8 then
            AppState.empIdInput = string.upper(AppState.empIdInput .. t)
        elseif AppState.activeField == "password" then
            AppState.passwordInput = AppState.passwordInput .. t
        end
    end
end

function attemptLogin()
    -- Strict GHZ-#### validation format
    if string.match(AppState.empIdInput, "^GHZ%-%d%d%d%d$") then
        if #AppState.passwordInput > 0 then
            AppState.current = "dashboard"
            AppState.loginError = ""
        else
            AppState.loginError = "PASSWORD CANNOT BE EMPTY."
        end
    else
        AppState.loginError = "INVALID ID. MUST BE GHZ-#### FORMAT."
    end
end
