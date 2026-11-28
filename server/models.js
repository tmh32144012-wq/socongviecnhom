const { DataTypes } = require('sequelize');

function initializeModels(sequelize) {
  // ===================================
  // 1. USERS MODEL
  // ===================================
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    avatar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    systemRole: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'user', // 'admin' | 'user'
    },
    tokenVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    authProvider: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'local', // 'local' | 'google' | 'facebook'
    },
    googleId: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    facebookId: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'Users',
    timestamps: false,
  });

  // ===================================
  // 2. CATEGORIES MODEL
  // ===================================
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: '#0f766e',
    },
  }, {
    tableName: 'Categories',
    timestamps: false,
  });

  // ===================================
  // 3. BOARDS MODEL (Không gian làm việc nhóm)
  // ===================================
  const Board = sequelize.define('Board', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    coverColor: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '#0f766e',
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'Boards',
    timestamps: false,
  });

  // ===================================
  // 4. BOARD MEMBERS MODEL (Thành viên & Phân quyền)
  // ===================================
  const BoardMember = sequelize.define('BoardMember', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    boardId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'member', // 'owner' | 'admin' | 'member'
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'accepted', // 'accepted' | 'pending'
    },
    invitedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'BoardMembers',
    timestamps: false,
  });

  // ===================================
  // 5. BOARD COLUMNS MODEL (Cột trạng thái Kanban động)
  // ===================================
  const BoardColumn = sequelize.define('BoardColumn', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    boardId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    color: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: '#64748b',
    },
    isDone: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    wipLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'BoardColumns',
    timestamps: false,
  });

  // ===================================
  // 6. TASKS MODEL (Công việc cá nhân & nhóm)
  // ===================================
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    boardId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    columnId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    priority: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'Trung bình',
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'Chưa bắt đầu',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastModifiedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    lastModifiedByName: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    recurrence: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'none', // 'none' | 'daily' | 'weekly' | 'monthly'
    },
  }, {
    tableName: 'Tasks',
    timestamps: false,
  });

  // ===================================
  // 7. TASK ASSIGNEES MODEL (Gán nhiều thành viên kiểu Trello)
  // ===================================
  const TaskAssignee = sequelize.define('TaskAssignee', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'TaskAssignees',
    timestamps: false,
  });

  // ===================================
  // 8. TASK COMMENTS MODEL (Bình luận công việc nhóm)
  // ===================================
  const TaskComment = sequelize.define('TaskComment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isAi: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'TaskComments',
    timestamps: false,
  });

  // ===================================
  // 9. TASK PROGRESS STEPS MODEL (Sub-tasks / Checklist)
  // ===================================
  const TaskProgressStep = sequelize.define('TaskProgressStep', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    stepOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'TaskProgressSteps',
    timestamps: false,
  });

  // ===================================
  // 10. NOTIFICATIONS MODEL
  // ===================================
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'system', // 'deadline', 'overdue', 'completed', 'new', 'assign', 'comment', 'invite', 'system'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'Notifications',
    timestamps: false,
  });

  // ===================================
  // 11. ATTACHMENTS MODEL
  // ===================================
  const Attachment = sequelize.define('Attachment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'Attachments',
    timestamps: false,
  });

  // ===================================
  // 12. ACTIVITY LOGS MODEL (Nhật ký hoạt động nhóm)
  // ===================================
  const ActivityLog = sequelize.define('ActivityLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    boardId: { type: DataTypes.INTEGER, allowNull: true },
    taskId: { type: DataTypes.INTEGER, allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING(80), allowNull: false },
    summary: { type: DataTypes.TEXT, allowNull: false },
    metadata: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'ActivityLogs',
    timestamps: false,
  });

  // ===================================
  // 13. BOARD LABELS & TASK LABELS (Nhãn dùng chung cho cả Bảng)
  // ===================================
  const BoardLabel = sequelize.define('BoardLabel', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    boardId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(80), allowNull: false },
    color: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '#0f766e' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'BoardLabels',
    timestamps: false,
  });

  const TaskLabel = sequelize.define('TaskLabel', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    taskId: { type: DataTypes.INTEGER, allowNull: false },
    labelId: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'TaskLabels',
    timestamps: false,
  });

  // ===================================
  // 14. BOARD MESSAGES (Phòng Chat chung của từng Bảng)
  // ===================================
  const BoardMessage = sequelize.define('BoardMessage', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    boardId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    isAi: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'BoardMessages',
    timestamps: false,
  });

  // ===================================
  // 16. AI CHAT SESSIONS (Lưu 3 đoạn chat gần nhất theo từng tài khoản)
  // ===================================
  const AiChatSession = sequelize.define('AiChatSession', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false, defaultValue: 'Cuộc trò chuyện mới' },
    messagesJson: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'AiChatSessions',
    timestamps: false,
  });

  // ===================================
  // 15. PASSWORD RESETS (OTP Quên mật khẩu)
  // ===================================
  const PasswordReset = sequelize.define('PasswordReset', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    otpHash: { type: DataTypes.STRING(255), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    used: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'PasswordResets',
    timestamps: false,
  });

  // ===================================
  // ASSOCIATIONS (SQL Server safe — no multiple cascade paths)
  // ===================================
  User.hasMany(Category, { foreignKey: 'userId', onDelete: 'CASCADE' });
  Category.belongsTo(User, { foreignKey: 'userId' });

  User.hasMany(Task, { foreignKey: 'userId', onDelete: 'CASCADE' });
  Task.belongsTo(User, { foreignKey: 'userId', as: 'creator' });

  User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
  Notification.belongsTo(User, { foreignKey: 'userId' });

  User.hasMany(Attachment, { foreignKey: 'userId', onDelete: 'NO ACTION' });
  Attachment.belongsTo(User, { foreignKey: 'userId' });

  Category.hasMany(Task, { foreignKey: 'categoryId', onDelete: 'SET NULL' });
  Task.belongsTo(Category, { foreignKey: 'categoryId' });

  Task.hasMany(TaskProgressStep, { foreignKey: 'taskId', as: 'progressSteps', onDelete: 'CASCADE' });
  TaskProgressStep.belongsTo(Task, { foreignKey: 'taskId' });

  Task.hasMany(Notification, { foreignKey: 'taskId', onDelete: 'SET NULL' });
  Notification.belongsTo(Task, { foreignKey: 'taskId' });

  Task.hasMany(Attachment, { foreignKey: 'taskId', as: 'attachments', onDelete: 'CASCADE' });
  Attachment.belongsTo(Task, { foreignKey: 'taskId' });

  // Board associations
  User.hasMany(Board, { foreignKey: 'ownerId', as: 'ownedBoards', onDelete: 'NO ACTION' });
  Board.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

  Board.hasMany(BoardMember, { foreignKey: 'boardId', as: 'members', onDelete: 'CASCADE' });
  BoardMember.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });
  User.hasMany(BoardMember, { foreignKey: 'userId', as: 'boardMemberships', onDelete: 'NO ACTION' });
  BoardMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  Board.hasMany(BoardColumn, { foreignKey: 'boardId', as: 'columns', onDelete: 'CASCADE' });
  BoardColumn.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });

  Board.hasMany(Task, { foreignKey: 'boardId', as: 'tasks', onDelete: 'NO ACTION' });
  Task.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });

  BoardColumn.hasMany(Task, { foreignKey: 'columnId', as: 'tasks', onDelete: 'NO ACTION' });
  Task.belongsTo(BoardColumn, { foreignKey: 'columnId', as: 'column' });

  // TaskAssignees associations
  Task.hasMany(TaskAssignee, { foreignKey: 'taskId', as: 'taskAssignees', onDelete: 'CASCADE' });
  TaskAssignee.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
  User.hasMany(TaskAssignee, { foreignKey: 'userId', as: 'assignedTasks', onDelete: 'NO ACTION' });
  TaskAssignee.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // TaskComments associations
  Task.hasMany(TaskComment, { foreignKey: 'taskId', as: 'comments', onDelete: 'CASCADE' });
  TaskComment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
  User.hasMany(TaskComment, { foreignKey: 'userId', as: 'comments', onDelete: 'NO ACTION' });
  TaskComment.belongsTo(User, { foreignKey: 'userId', as: 'author' });

  // New Collaboration Associations
  Board.hasMany(BoardLabel, { foreignKey: 'boardId', as: 'labels', onDelete: 'CASCADE' });
  BoardLabel.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });

  Task.hasMany(TaskLabel, { foreignKey: 'taskId', as: 'taskLabels', onDelete: 'CASCADE' });
  TaskLabel.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
  BoardLabel.hasMany(TaskLabel, { foreignKey: 'labelId', as: 'taskLabels', onDelete: 'NO ACTION' });
  TaskLabel.belongsTo(BoardLabel, { foreignKey: 'labelId', as: 'label' });

  Board.hasMany(BoardMessage, { foreignKey: 'boardId', as: 'messages', onDelete: 'CASCADE' });
  BoardMessage.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });
  User.hasMany(BoardMessage, { foreignKey: 'userId', as: 'boardMessages', onDelete: 'NO ACTION' });
  BoardMessage.belongsTo(User, { foreignKey: 'userId', as: 'author' });

  Board.hasMany(ActivityLog, { foreignKey: 'boardId', as: 'activities', onDelete: 'CASCADE' });
  ActivityLog.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });
  User.hasMany(ActivityLog, { foreignKey: 'userId', as: 'activities', onDelete: 'NO ACTION' });
  ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'actor' });

  User.hasMany(AiChatSession, { foreignKey: 'userId', as: 'aiChatSessions', onDelete: 'CASCADE' });
  AiChatSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  return {
    User,
    Category,
    Board,
    BoardMember,
    BoardColumn,
    Task,
    TaskAssignee,
    TaskComment,
    TaskProgressStep,
    Notification,
    Attachment,
    ActivityLog,
    BoardLabel,
    TaskLabel,
    BoardMessage,
    PasswordReset,
    AiChatSession,
  };
}

// SAFE MIGRATION HELPER FOR SQL SERVER
async function runSafeMigrations(sequelize) {
  try {
    // 1. Users table upgrades (only if already exists)
    await sequelize.query(`
      IF OBJECT_ID('Users', 'U') IS NOT NULL
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'avatar')
          ALTER TABLE Users ADD avatar NVARCHAR(MAX) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'createdAt')
          ALTER TABLE Users ADD createdAt DATETIMEOFFSET NULL CONSTRAINT DF_Users_createdAt DEFAULT SYSDATETIMEOFFSET();
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'systemRole')
          ALTER TABLE Users ADD systemRole NVARCHAR(30) NOT NULL CONSTRAINT DF_Users_systemRole DEFAULT 'user';
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'tokenVersion')
          ALTER TABLE Users ADD tokenVersion INT NOT NULL CONSTRAINT DF_Users_tokenVersion DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'authProvider')
          ALTER TABLE Users ADD authProvider NVARCHAR(30) NOT NULL CONSTRAINT DF_Users_authProvider DEFAULT 'local';
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'googleId')
          ALTER TABLE Users ADD googleId NVARCHAR(120) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'facebookId')
          ALTER TABLE Users ADD facebookId NVARCHAR(120) NULL;
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('Users', 'U') IS NOT NULL
      BEGIN
        UPDATE Users SET systemRole = 'admin' WHERE email = 'user@example.com' AND systemRole <> 'admin';
        IF NOT EXISTS (SELECT 1 FROM Users WHERE systemRole = 'admin')
          UPDATE TOP (1) Users SET systemRole = 'admin';
      END
    `);

    // 2. Categories table upgrades
    await sequelize.query(`
      IF OBJECT_ID('Categories', 'U') IS NOT NULL
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Categories') AND name = 'color')
          ALTER TABLE Categories ADD color NVARCHAR(50) NULL CONSTRAINT DF_Categories_color DEFAULT '#0f766e';
      END
    `);

    // 3. Boards, BoardMembers, BoardColumns tables
    await sequelize.query(`
      IF OBJECT_ID('Boards', 'U') IS NULL AND OBJECT_ID('Users', 'U') IS NOT NULL
      BEGIN
        CREATE TABLE dbo.Boards (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(150) NOT NULL,
          description NVARCHAR(MAX) NULL,
          coverColor NVARCHAR(50) NOT NULL CONSTRAINT DF_Boards_coverColor DEFAULT '#0f766e',
          ownerId INT NOT NULL,
          createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Boards_createdAt DEFAULT SYSDATETIMEOFFSET(),
          updatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Boards_updatedAt DEFAULT SYSDATETIMEOFFSET(),
          CONSTRAINT FK_Boards_Owner FOREIGN KEY (ownerId) REFERENCES dbo.Users(id) ON DELETE NO ACTION
        );
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('BoardMembers', 'U') IS NULL AND OBJECT_ID('Boards', 'U') IS NOT NULL
      BEGIN
        CREATE TABLE dbo.BoardMembers (
          id INT IDENTITY(1,1) PRIMARY KEY,
          boardId INT NOT NULL,
          userId INT NOT NULL,
          role NVARCHAR(30) NOT NULL CONSTRAINT DF_BoardMembers_role DEFAULT 'member',
          status NVARCHAR(30) NOT NULL CONSTRAINT DF_BoardMembers_status DEFAULT 'accepted',
          invitedBy INT NULL,
          joinedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_BoardMembers_joinedAt DEFAULT SYSDATETIMEOFFSET(),
          CONSTRAINT FK_BoardMembers_Board FOREIGN KEY (boardId) REFERENCES dbo.Boards(id) ON DELETE CASCADE,
          CONSTRAINT FK_BoardMembers_User FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE NO ACTION
        );
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('BoardColumns', 'U') IS NULL AND OBJECT_ID('Boards', 'U') IS NOT NULL
      BEGIN
        CREATE TABLE dbo.BoardColumns (
          id INT IDENTITY(1,1) PRIMARY KEY,
          boardId INT NOT NULL,
          title NVARCHAR(100) NOT NULL,
          position INT NOT NULL CONSTRAINT DF_BoardColumns_position DEFAULT 0,
          color NVARCHAR(50) NULL CONSTRAINT DF_BoardColumns_color DEFAULT '#64748b',
          isDone BIT NOT NULL CONSTRAINT DF_BoardColumns_isDone DEFAULT 0,
          createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_BoardColumns_createdAt DEFAULT SYSDATETIMEOFFSET(),
          CONSTRAINT FK_BoardColumns_Board FOREIGN KEY (boardId) REFERENCES dbo.Boards(id) ON DELETE CASCADE
        );
      END
    `);

    // 4. Tasks table upgrades (split ALTER TABLE and UPDATE into separate SQL Server batches!)
    await sequelize.query(`
      IF OBJECT_ID('Tasks', 'U') IS NOT NULL
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'startDate')
          ALTER TABLE Tasks ADD startDate DATE NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'progress')
          ALTER TABLE Tasks ADD progress INT NULL CONSTRAINT DF_Tasks_progress DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'notes')
          ALTER TABLE Tasks ADD notes NVARCHAR(MAX) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'isArchived')
          ALTER TABLE Tasks ADD isArchived BIT NULL CONSTRAINT DF_Tasks_isArchived DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'boardId')
          ALTER TABLE Tasks ADD boardId INT NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'columnId')
          ALTER TABLE Tasks ADD columnId INT NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'position')
          ALTER TABLE Tasks ADD position INT NOT NULL CONSTRAINT DF_Tasks_position DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'createdAt')
          ALTER TABLE Tasks ADD createdAt DATETIMEOFFSET NULL CONSTRAINT DF_Tasks_createdAt DEFAULT SYSDATETIMEOFFSET();
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'updatedAt')
          ALTER TABLE Tasks ADD updatedAt DATETIMEOFFSET NULL CONSTRAINT DF_Tasks_updatedAt DEFAULT SYSDATETIMEOFFSET();
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'completedAt')
          ALTER TABLE Tasks ADD completedAt DATETIMEOFFSET NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'lastModifiedById')
          ALTER TABLE Tasks ADD lastModifiedById INT NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'lastModifiedByName')
          ALTER TABLE Tasks ADD lastModifiedByName NVARCHAR(150) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'recurrence')
          ALTER TABLE Tasks ADD recurrence NVARCHAR(30) NOT NULL CONSTRAINT DF_Tasks_recurrence DEFAULT 'none';
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('Tasks', 'U') IS NOT NULL
      BEGIN
        UPDATE Tasks SET progress = 0 WHERE progress IS NULL;
        UPDATE Tasks SET isArchived = 0 WHERE isArchived IS NULL;
        UPDATE Tasks SET position = 0 WHERE position IS NULL;
        UPDATE Tasks SET createdAt = SYSDATETIMEOFFSET() WHERE createdAt IS NULL;
        UPDATE Tasks SET updatedAt = SYSDATETIMEOFFSET() WHERE updatedAt IS NULL;
        UPDATE Tasks SET completedAt = updatedAt WHERE (status = N'Hoàn thành' OR progress = 100) AND completedAt IS NULL;
        UPDATE Tasks SET lastModifiedById = userId WHERE lastModifiedById IS NULL;
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('Users', 'U') IS NOT NULL
        UPDATE Users SET createdAt = SYSDATETIMEOFFSET() WHERE createdAt IS NULL;
    `);

    // 5. TaskAssignees & TaskComments tables
    await sequelize.query(`
      IF OBJECT_ID('TaskAssignees', 'U') IS NULL AND OBJECT_ID('Tasks', 'U') IS NOT NULL
      BEGIN
        CREATE TABLE dbo.TaskAssignees (
          id INT IDENTITY(1,1) PRIMARY KEY,
          taskId INT NOT NULL,
          userId INT NOT NULL,
          assignedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_TaskAssignees_assignedAt DEFAULT SYSDATETIMEOFFSET(),
          CONSTRAINT FK_TaskAssignees_Task FOREIGN KEY (taskId) REFERENCES dbo.Tasks(id) ON DELETE CASCADE,
          CONSTRAINT FK_TaskAssignees_User FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE NO ACTION
        );
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('TaskComments', 'U') IS NULL AND OBJECT_ID('Tasks', 'U') IS NOT NULL
      BEGIN
        CREATE TABLE dbo.TaskComments (
          id INT IDENTITY(1,1) PRIMARY KEY,
          taskId INT NOT NULL,
          userId INT NOT NULL,
          content NVARCHAR(MAX) NOT NULL,
          createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_TaskComments_createdAt DEFAULT SYSDATETIMEOFFSET(),
          updatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_TaskComments_updatedAt DEFAULT SYSDATETIMEOFFSET(),
          CONSTRAINT FK_TaskComments_Task FOREIGN KEY (taskId) REFERENCES dbo.Tasks(id) ON DELETE CASCADE,
          CONSTRAINT FK_TaskComments_User FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE NO ACTION
        );
      END
    `);

    // 6. Legacy ProgressSteps rename + stepOrder check
    await sequelize.query(`
      IF OBJECT_ID('ProgressSteps', 'U') IS NOT NULL AND OBJECT_ID('TaskProgressSteps', 'U') IS NULL
      BEGIN
        EXEC sp_rename 'ProgressSteps', 'TaskProgressSteps';
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('TaskProgressSteps', 'U') IS NOT NULL
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TaskProgressSteps') AND name = 'stepOrder')
          ALTER TABLE TaskProgressSteps ADD stepOrder INT NOT NULL CONSTRAINT DF_TaskProgressSteps_stepOrder DEFAULT 0;
      END
    `);

    // 7. New tables: ActivityLogs, BoardLabels, TaskLabels, BoardMessages, PasswordResets
    await sequelize.query(`
      IF OBJECT_ID('ActivityLogs', 'U') IS NULL AND OBJECT_ID('Users', 'U') IS NOT NULL
      BEGIN
        CREATE TABLE dbo.ActivityLogs (
          id INT IDENTITY(1,1) PRIMARY KEY,
          boardId INT NULL,
          taskId INT NULL,
          userId INT NOT NULL,
          action NVARCHAR(80) NOT NULL,
          summary NVARCHAR(MAX) NOT NULL,
          metadata NVARCHAR(MAX) NULL,
          createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_ActivityLogs_createdAt DEFAULT SYSDATETIMEOFFSET(),
          CONSTRAINT FK_ActivityLogs_Board FOREIGN KEY (boardId) REFERENCES dbo.Boards(id) ON DELETE CASCADE,
          CONSTRAINT FK_ActivityLogs_User FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE NO ACTION
        );
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('BoardLabels', 'U') IS NULL AND OBJECT_ID('Boards', 'U') IS NOT NULL
      BEGIN
        CREATE TABLE dbo.BoardLabels (
          id INT IDENTITY(1,1) PRIMARY KEY,
          boardId INT NOT NULL,
          name NVARCHAR(80) NOT NULL,
          color NVARCHAR(40) NOT NULL CONSTRAINT DF_BoardLabels_color DEFAULT '#0f766e',
          createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_BoardLabels_createdAt DEFAULT SYSDATETIMEOFFSET(),
          CONSTRAINT FK_BoardLabels_Board FOREIGN KEY (boardId) REFERENCES dbo.Boards(id) ON DELETE CASCADE
        );
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('TaskLabels', 'U') IS NULL AND OBJECT_ID('Tasks', 'U') IS NOT NULL AND OBJECT_ID('BoardLabels', 'U') IS NOT NULL
      BEGIN
        CREATE TABLE dbo.TaskLabels (
          id INT IDENTITY(1,1) PRIMARY KEY,
          taskId INT NOT NULL,
          labelId INT NOT NULL,
          CONSTRAINT FK_TaskLabels_Task FOREIGN KEY (taskId) REFERENCES dbo.Tasks(id) ON DELETE CASCADE,
          CONSTRAINT FK_TaskLabels_Label FOREIGN KEY (labelId) REFERENCES dbo.BoardLabels(id) ON DELETE NO ACTION
        );
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('BoardMessages', 'U') IS NULL AND OBJECT_ID('Boards', 'U') IS NOT NULL
      BEGIN
        CREATE TABLE dbo.BoardMessages (
          id INT IDENTITY(1,1) PRIMARY KEY,
          boardId INT NOT NULL,
          userId INT NOT NULL,
          content NVARCHAR(MAX) NOT NULL,
          createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_BoardMessages_createdAt DEFAULT SYSDATETIMEOFFSET(),
          CONSTRAINT FK_BoardMessages_Board FOREIGN KEY (boardId) REFERENCES dbo.Boards(id) ON DELETE CASCADE,
          CONSTRAINT FK_BoardMessages_User FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE NO ACTION
        );
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('PasswordResets', 'U') IS NULL AND OBJECT_ID('Users', 'U') IS NOT NULL
      BEGIN
        CREATE TABLE dbo.PasswordResets (
          id INT IDENTITY(1,1) PRIMARY KEY,
          userId INT NOT NULL,
          email NVARCHAR(255) NOT NULL,
          otpHash NVARCHAR(255) NOT NULL,
          expiresAt DATETIMEOFFSET NOT NULL,
          used BIT NOT NULL CONSTRAINT DF_PasswordResets_used DEFAULT 0,
          createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_PasswordResets_createdAt DEFAULT SYSDATETIMEOFFSET(),
          CONSTRAINT FK_PasswordResets_User FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE
        );
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('AiChatSessions', 'U') IS NULL AND OBJECT_ID('Users', 'U') IS NOT NULL
      BEGIN
        CREATE TABLE dbo.AiChatSessions (
          id INT IDENTITY(1,1) PRIMARY KEY,
          userId INT NOT NULL,
          title NVARCHAR(200) NOT NULL CONSTRAINT DF_AiChatSessions_title DEFAULT N'Cuộc trò chuyện mới',
          messagesJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_AiChatSessions_messages DEFAULT N'[]',
          createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_AiChatSessions_createdAt DEFAULT SYSDATETIMEOFFSET(),
          updatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_AiChatSessions_updatedAt DEFAULT SYSDATETIMEOFFSET(),
          CONSTRAINT FK_AiChatSessions_User FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE
        );
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('TaskComments', 'U') IS NOT NULL AND COL_LENGTH('TaskComments', 'isAi') IS NULL
      BEGIN
        ALTER TABLE dbo.TaskComments ADD isAi BIT NOT NULL CONSTRAINT DF_TaskComments_isAi DEFAULT 0;
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('BoardMessages', 'U') IS NOT NULL AND COL_LENGTH('BoardMessages', 'isAi') IS NULL
      BEGIN
        ALTER TABLE dbo.BoardMessages ADD isAi BIT NOT NULL CONSTRAINT DF_BoardMessages_isAi DEFAULT 0;
      END
    `);

    await sequelize.query(`
      IF OBJECT_ID('BoardColumns', 'U') IS NOT NULL AND COL_LENGTH('BoardColumns', 'wipLimit') IS NULL
      BEGIN
        ALTER TABLE dbo.BoardColumns ADD wipLimit INT NULL;
      END
    `);

    console.log('✅ SQL Server schema verified and migrated successfully');
  } catch (err) {
    console.error('Migration error:', err.message);
  }
}

const { sequelize } = require('./db');
const { Op } = require('sequelize');
const initialized = initializeModels(sequelize);

module.exports = {
  initializeModels,
  runSafeMigrations,
  sequelize,
  Op,
  ...initialized,
};
