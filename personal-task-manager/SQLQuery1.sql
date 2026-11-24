-- ============================================
-- CƠ SỞ DỮ LIỆU: TaskManager
-- HỆ THỐNG QUẢN LÝ CÔNG VIỆC NHÓM KIỂU KANBAN (TRELLO CLONE)
-- Tương thích 100% với Sequelize Models & SQL Server
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'TaskManager')
BEGIN
    CREATE DATABASE TaskManager;
END
GO

USE TaskManager;
GO

-- ============================================
-- 1. BẢNG USERS (Người dùng)
-- ============================================
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        email NVARCHAR(255) NOT NULL UNIQUE,
        passwordHash NVARCHAR(255) NOT NULL,
        avatar NVARCHAR(MAX) NULL,
        createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Users_createdAt DEFAULT SYSDATETIMEOFFSET()
    );
END
GO

-- ============================================
-- 2. BẢNG CATEGORIES (Nhãn / Danh mục công việc)
-- ============================================
IF OBJECT_ID('dbo.Categories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        userId INT NOT NULL,
        name NVARCHAR(100) NOT NULL,
        color NVARCHAR(50) NULL CONSTRAINT DF_Categories_color DEFAULT '#0f766e',

        CONSTRAINT FK_Categories_Users
            FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE
    );
END
GO

-- ============================================
-- 3. BẢNG BOARDS (Không gian làm việc nhóm)
-- ============================================
IF OBJECT_ID('dbo.Boards', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Boards (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(150) NOT NULL,
        description NVARCHAR(MAX) NULL,
        coverColor NVARCHAR(50) NOT NULL CONSTRAINT DF_Boards_coverColor DEFAULT '#0f766e',
        ownerId INT NOT NULL,
        createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Boards_createdAt DEFAULT SYSDATETIMEOFFSET(),
        updatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Boards_updatedAt DEFAULT SYSDATETIMEOFFSET(),

        CONSTRAINT FK_Boards_Owner
            FOREIGN KEY (ownerId) REFERENCES dbo.Users(id) ON DELETE NO ACTION
    );
END
GO

-- ============================================
-- 4. BẢNG BOARD MEMBERS (Thành viên & Phân quyền)
-- ============================================
IF OBJECT_ID('dbo.BoardMembers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BoardMembers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        boardId INT NOT NULL,
        userId INT NOT NULL,
        role NVARCHAR(30) NOT NULL CONSTRAINT DF_BoardMembers_role DEFAULT 'member',
        status NVARCHAR(30) NOT NULL CONSTRAINT DF_BoardMembers_status DEFAULT 'accepted',
        invitedBy INT NULL,
        joinedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_BoardMembers_joinedAt DEFAULT SYSDATETIMEOFFSET(),

        CONSTRAINT FK_BoardMembers_Board
            FOREIGN KEY (boardId) REFERENCES dbo.Boards(id) ON DELETE CASCADE,
        CONSTRAINT FK_BoardMembers_User
            FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE NO ACTION
    );
END
GO

-- ============================================
-- 5. BẢNG BOARD COLUMNS (Cột trạng thái Kanban động)
-- ============================================
IF OBJECT_ID('dbo.BoardColumns', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BoardColumns (
        id INT IDENTITY(1,1) PRIMARY KEY,
        boardId INT NOT NULL,
        title NVARCHAR(100) NOT NULL,
        position INT NOT NULL CONSTRAINT DF_BoardColumns_position DEFAULT 0,
        color NVARCHAR(50) NULL CONSTRAINT DF_BoardColumns_color DEFAULT '#64748b',
        isDone BIT NOT NULL CONSTRAINT DF_BoardColumns_isDone DEFAULT 0,
        createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_BoardColumns_createdAt DEFAULT SYSDATETIMEOFFSET(),

        CONSTRAINT FK_BoardColumns_Board
            FOREIGN KEY (boardId) REFERENCES dbo.Boards(id) ON DELETE CASCADE
    );
END
GO

-- ============================================
-- 6. BẢNG TASKS (Thẻ công việc cá nhân & nhóm)
-- ============================================
IF OBJECT_ID('dbo.Tasks', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Tasks (
        id INT IDENTITY(1,1) PRIMARY KEY,
        userId INT NOT NULL,
        boardId INT NULL,
        columnId INT NULL,
        position INT NOT NULL CONSTRAINT DF_Tasks_position DEFAULT 0,
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        priority NVARCHAR(50) NOT NULL CONSTRAINT DF_Tasks_priority DEFAULT N'Trung bình',
        status NVARCHAR(50) NOT NULL CONSTRAINT DF_Tasks_status DEFAULT N'Chưa bắt đầu',
        startDate DATE NULL,
        dueDate DATE NULL,
        progress INT NOT NULL CONSTRAINT DF_Tasks_progress DEFAULT 0,
        notes NVARCHAR(MAX) NULL,
        isArchived BIT NOT NULL CONSTRAINT DF_Tasks_isArchived DEFAULT 0,
        categoryId INT NULL,
        createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Tasks_createdAt DEFAULT SYSDATETIMEOFFSET(),
        updatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Tasks_updatedAt DEFAULT SYSDATETIMEOFFSET(),

        CONSTRAINT FK_Tasks_Users
            FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE,
        CONSTRAINT FK_Tasks_Categories
            FOREIGN KEY (categoryId) REFERENCES dbo.Categories(id) ON DELETE SET NULL,
        CONSTRAINT FK_Tasks_Boards
            FOREIGN KEY (boardId) REFERENCES dbo.Boards(id) ON DELETE NO ACTION,
        CONSTRAINT FK_Tasks_Columns
            FOREIGN KEY (columnId) REFERENCES dbo.BoardColumns(id) ON DELETE NO ACTION
    );
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Tasks') AND name = 'boardId')
        ALTER TABLE dbo.Tasks ADD boardId INT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Tasks') AND name = 'columnId')
        ALTER TABLE dbo.Tasks ADD columnId INT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Tasks') AND name = 'position')
        ALTER TABLE dbo.Tasks ADD position INT NOT NULL CONSTRAINT DF_Tasks_position DEFAULT 0;
END
GO

-- ============================================
-- 7. BẢNG TASK ASSIGNEES (Gán nhiều thành viên)
-- ============================================
IF OBJECT_ID('dbo.TaskAssignees', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TaskAssignees (
        id INT IDENTITY(1,1) PRIMARY KEY,
        taskId INT NOT NULL,
        userId INT NOT NULL,
        assignedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_TaskAssignees_assignedAt DEFAULT SYSDATETIMEOFFSET(),

        CONSTRAINT FK_TaskAssignees_Task
            FOREIGN KEY (taskId) REFERENCES dbo.Tasks(id) ON DELETE CASCADE,
        CONSTRAINT FK_TaskAssignees_User
            FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE NO ACTION
    );
END
GO

-- ============================================
-- 8. BẢNG TASK COMMENTS (Bình luận công việc)
-- ============================================
IF OBJECT_ID('dbo.TaskComments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TaskComments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        taskId INT NOT NULL,
        userId INT NOT NULL,
        content NVARCHAR(MAX) NOT NULL,
        createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_TaskComments_createdAt DEFAULT SYSDATETIMEOFFSET(),
        updatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_TaskComments_updatedAt DEFAULT SYSDATETIMEOFFSET(),

        CONSTRAINT FK_TaskComments_Task
            FOREIGN KEY (taskId) REFERENCES dbo.Tasks(id) ON DELETE CASCADE,
        CONSTRAINT FK_TaskComments_User
            FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE NO ACTION
    );
END
GO

-- ============================================
-- 9. BẢNG TASK PROGRESS STEPS (Checklist công việc con)
-- ============================================
IF OBJECT_ID('dbo.TaskProgressSteps', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TaskProgressSteps (
        id INT IDENTITY(1,1) PRIMARY KEY,
        taskId INT NOT NULL,
        title NVARCHAR(255) NOT NULL,
        completed BIT NOT NULL CONSTRAINT DF_TaskProgressSteps_completed DEFAULT 0,
        stepOrder INT NOT NULL CONSTRAINT DF_TaskProgressSteps_stepOrder DEFAULT 0,

        CONSTRAINT FK_TaskProgressSteps_Tasks
            FOREIGN KEY (taskId) REFERENCES dbo.Tasks(id) ON DELETE CASCADE
    );
END
GO

-- ============================================
-- 10. BẢNG NOTIFICATIONS (Thông báo hệ thống)
-- ============================================
IF OBJECT_ID('dbo.Notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        userId INT NOT NULL,
        taskId INT NULL,
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        type NVARCHAR(50) NOT NULL CONSTRAINT DF_Notifications_type DEFAULT 'system',
        isRead BIT NOT NULL CONSTRAINT DF_Notifications_isRead DEFAULT 0,
        createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Notifications_createdAt DEFAULT SYSDATETIMEOFFSET(),

        CONSTRAINT FK_Notifications_Users
            FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE,
        CONSTRAINT FK_Notifications_Tasks
            FOREIGN KEY (taskId) REFERENCES dbo.Tasks(id) ON DELETE SET NULL
    );
END
GO

-- ============================================
-- 11. BẢNG ATTACHMENTS (Tệp đính kèm)
-- ============================================
IF OBJECT_ID('dbo.Attachments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Attachments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        taskId INT NOT NULL,
        userId INT NOT NULL,
        fileName NVARCHAR(255) NOT NULL,
        originalName NVARCHAR(255) NOT NULL,
        mimeType NVARCHAR(100) NULL,
        fileSize BIGINT NULL,
        filePath NVARCHAR(500) NOT NULL,
        createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Attachments_createdAt DEFAULT SYSDATETIMEOFFSET(),

        CONSTRAINT FK_Attachments_Tasks
            FOREIGN KEY (taskId) REFERENCES dbo.Tasks(id) ON DELETE CASCADE,
        CONSTRAINT FK_Attachments_Users
            FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE NO ACTION
    );
END
GO

SELECT TABLE_NAME, TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO
