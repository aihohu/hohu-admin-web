const local: App.I18n.Schema = {
  system: {
    title: 'HoHuAdmin',
    updateTitle: 'System Version Update Notification',
    updateContent: 'A new version of the system has been detected. Do you want to refresh the page immediately?',
    updateConfirm: 'Refresh immediately',
    updateCancel: 'Later'
  },
  common: {
    action: 'Action',
    add: 'Add',
    addSuccess: 'Add Success',
    backToHome: 'Back to home',
    batchDelete: 'Batch Delete',
    cancel: 'Cancel',
    close: 'Close',
    check: 'Check',
    selectAll: 'Select All',
    expandColumn: 'Expand Column',
    columnSetting: 'Column Setting',
    config: 'Config',
    confirm: 'Confirm',
    delete: 'Delete',
    deleteSuccess: 'Delete Success',
    confirmDelete: 'Are you sure you want to delete?',
    edit: 'Edit',
    warning: 'Warning',
    error: 'Error',
    index: 'Index',
    keywordSearch: 'Please enter keyword',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to log out?',
    lookForward: 'Coming soon',
    modify: 'Modify',
    modifySuccess: 'Modify Success',
    noData: 'No Data',
    operate: 'Operate',
    pleaseCheckValue: 'Please check whether the value is valid',
    refresh: 'Refresh',
    reset: 'Reset',
    search: 'Search',
    switch: 'Switch',
    tip: 'Tip',
    trigger: 'Trigger',
    update: 'Update',
    updateSuccess: 'Update Success',
    userCenter: 'User Center',
    yesOrNo: {
      yes: 'Yes',
      no: 'No'
    },
    saveSuccess: 'Save Success',
    clear: 'Clear'
  },
  request: {
    logout: 'Logout user after request failed',
    logoutMsg: 'User status is invalid, please log in again',
    logoutWithModal: 'Pop up modal after request failed and then log out user',
    logoutWithModalMsg: 'User status is invalid, please log in again',
    refreshToken: 'The requested token has expired, refresh the token',
    tokenExpired: 'The requested token has expired'
  },
  theme: {
    themeDrawerTitle: 'Theme Configuration',
    tabs: {
      appearance: 'Appearance',
      layout: 'Layout',
      general: 'General',
      preset: 'Preset'
    },
    appearance: {
      themeSchema: {
        title: 'Theme Schema',
        light: 'Light',
        dark: 'Dark',
        auto: 'Follow System'
      },
      grayscale: 'Grayscale',
      colourWeakness: 'Colour Weakness',
      themeColor: {
        title: 'Theme Color',
        primary: 'Primary',
        info: 'Info',
        success: 'Success',
        warning: 'Warning',
        error: 'Error',
        followPrimary: 'Follow Primary'
      },
      themeRadius: {
        title: 'Theme Radius'
      },
      recommendColor: 'Apply Recommended Color Algorithm',
      recommendColorDesc: 'The recommended color algorithm refers to',
      preset: {
        title: 'Theme Presets',
        apply: 'Apply',
        applySuccess: 'Preset applied successfully',
        default: {
          name: 'Default Preset',
          desc: 'Default theme preset with balanced settings'
        },
        dark: {
          name: 'Dark Preset',
          desc: 'Dark theme preset for night time usage'
        },
        compact: {
          name: 'Compact Preset',
          desc: 'Compact layout preset for small screens'
        },
        azir: {
          name: "Azir's Preset",
          desc: 'It is a cold and elegant preset that Azir likes'
        }
      }
    },
    layout: {
      layoutMode: {
        title: 'Layout Mode',
        vertical: 'Vertical Mode',
        horizontal: 'Horizontal Mode',
        'vertical-mix': 'Vertical Mix Mode',
        'vertical-hybrid-header-first': 'Left Hybrid Header-First',
        'top-hybrid-sidebar-first': 'Top-Hybrid Sidebar-First',
        'top-hybrid-header-first': 'Top-Hybrid Header-First',
        vertical_detail: 'Vertical menu layout, with the menu on the left and content on the right.',
        'vertical-mix_detail':
          'Vertical mix-menu layout, with the primary menu on the dark left side and the secondary menu on the lighter left side.',
        'vertical-hybrid-header-first_detail':
          'Left hybrid layout, with the primary menu at the top, the secondary menu on the dark left side, and the tertiary menu on the lighter left side.',
        horizontal_detail: 'Horizontal menu layout, with the menu at the top and content below.',
        'top-hybrid-sidebar-first_detail':
          'Top hybrid layout, with the primary menu on the left and the secondary menu at the top.',
        'top-hybrid-header-first_detail':
          'Top hybrid layout, with the primary menu at the top and the secondary menu on the left.'
      },
      tab: {
        title: 'Tab Settings',
        visible: 'Tab Visible',
        cache: 'Tag Bar Info Cache',
        cacheTip: 'One-click to open/close global keepalive',
        height: 'Tab Height',
        mode: {
          title: 'Tab Mode',
          slider: 'Slider',
          chrome: 'Chrome',
          button: 'Button'
        },
        closeByMiddleClick: 'Close Tab by Middle Click',
        closeByMiddleClickTip: 'Enable closing tabs by clicking with the middle mouse button'
      },
      header: {
        title: 'Header Settings',
        height: 'Header Height',
        breadcrumb: {
          visible: 'Breadcrumb Visible',
          showIcon: 'Breadcrumb Icon Visible'
        }
      },
      sider: {
        title: 'Sider Settings',
        inverted: 'Dark Sider',
        width: 'Sider Width',
        collapsedWidth: 'Sider Collapsed Width',
        mixWidth: 'Mix Sider Width',
        mixCollapsedWidth: 'Mix Sider Collapse Width',
        mixChildMenuWidth: 'Mix Child Menu Width',
        autoSelectFirstMenu: 'Auto Select First Submenu',
        autoSelectFirstMenuTip:
          'When a first-level menu is clicked, the first submenu is automatically selected and navigated to the deepest level'
      },
      footer: {
        title: 'Footer Settings',
        visible: 'Footer Visible',
        fixed: 'Fixed Footer',
        height: 'Footer Height',
        right: 'Right Footer'
      },
      content: {
        title: 'Content Area Settings',
        scrollMode: {
          title: 'Scroll Mode',
          tip: 'The theme scroll only scrolls the main part, the outer scroll can carry the header and footer together',
          wrapper: 'Wrapper',
          content: 'Content'
        },
        page: {
          animate: 'Page Animate',
          mode: {
            title: 'Page Animate Mode',
            fade: 'Fade',
            'fade-slide': 'Slide',
            'fade-bottom': 'Fade Zoom',
            'fade-scale': 'Fade Scale',
            'zoom-fade': 'Zoom Fade',
            'zoom-out': 'Zoom Out',
            none: 'None'
          }
        },
        fixedHeaderAndTab: 'Fixed Header And Tab'
      }
    },
    general: {
      title: 'General Settings',
      watermark: {
        title: 'Watermark Settings',
        visible: 'Watermark Full Screen Visible',
        text: 'Custom Watermark Text',
        enableUserName: 'Enable User Name Watermark',
        enableTime: 'Show Current Time',
        timeFormat: 'Time Format'
      },
      multilingual: {
        title: 'Multilingual Settings',
        visible: 'Display multilingual button'
      },
      globalSearch: {
        title: 'Global Search Settings',
        visible: 'Display GlobalSearch button'
      }
    },
    configOperation: {
      copyConfig: 'Copy Config',
      copySuccessMsg: 'Copy Success, Please replace the variable "themeSettings" in "src/theme/settings.ts"',
      resetConfig: 'Reset Config',
      resetSuccessMsg: 'Reset Success'
    }
  },
  route: {
    login: 'Login',
    403: 'No Permission',
    404: 'Page Not Found',
    500: 'Server Error',
    'iframe-page': 'Iframe',
    home: 'Home',
    profile: 'Profile',
    system: 'System Manage',
    system_user: 'User Manage',
    system_role: 'Role Manage',
    system_menu: 'Menu Manage',
    system_dict: 'Dict Manage',
    system_dict_data: 'Dictionary Data',
    system_dept: 'Dept Manage',
    system_file: 'File Manage',
    system_job: 'Scheduled Job',
    'system_job-log': 'Job Log',
    ai: 'AI Assistant',
    ai_chat: 'AI Chat',
    ai_provider: 'Model Manage'
  },
  page: {
    login: {
      common: {
        loginOrRegister: 'Login / Register',
        userNamePlaceholder: 'Please enter user name',
        phonePlaceholder: 'Please enter phone number',
        codePlaceholder: 'Please enter verification code',
        passwordPlaceholder: 'Please enter password',
        confirmPasswordPlaceholder: 'Please enter password again',
        codeLogin: 'Verification code login',
        confirm: 'Confirm',
        back: 'Back',
        validateSuccess: 'Verification passed',
        loginSuccess: 'Login successfully',
        welcomeBack: 'Welcome back, {userName} !'
      },
      pwdLogin: {
        title: 'Password Login',
        rememberMe: 'Remember me',
        forgetPassword: 'Forget password?',
        register: 'Register',
        otherAccountLogin: 'Other Account Login',
        otherLoginMode: 'Other Login Mode',
        superAdmin: 'Super Admin',
        admin: 'Admin',
        user: 'User'
      },
      codeLogin: {
        title: 'Verification Code Login',
        getCode: 'Get verification code',
        reGetCode: 'Reacquire after {time}s',
        sendCodeSuccess: 'Verification code sent successfully',
        imageCodePlaceholder: 'Please enter image verification code'
      },
      register: {
        title: 'Register',
        agreement: 'I have read and agree to',
        protocol: '《User Agreement》',
        policy: '《Privacy Policy》'
      },
      resetPwd: {
        title: 'Reset Password'
      },
      bindWeChat: {
        title: 'Bind WeChat'
      }
    },
    profile: {
      title: 'Profile',
      baseInfo: 'Basic Info',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      passwordMinLength: 'Password must be at least 6 characters',
      oldPassword: 'Current Password',
      oldPasswordPlaceholder: 'Please enter current password',
      confirmPasswordPlaceholder: 'Please enter new password again',
      registerTime: 'Register Time',
      confirmPwdMismatch: 'The two passwords are inconsistent',
      passwordChangeSuccess: 'Password changed successfully',
      changeAvatar: 'Change Avatar',
      presetAvatar: 'Choose a preset avatar',
      uploadAvatar: 'Upload custom avatar'
    },
    home: {
      branchDesc:
        'Welcome to HoHu, a front-end and back-end separated permission management system based on FastAPI, SQLAlchemy, Vue3 & Naiveui.',
      greeting: 'Good morning, {userName}, today is another day full of vitality!',
      weatherDesc: 'Today is cloudy to clear, 20℃ - 25℃!',
      projectCount: 'Project Count',
      todo: 'Todo',
      message: 'Message',
      downloadCount: 'Download Count',
      registerCount: 'Register Count',
      schedule: 'Work and rest Schedule',
      study: 'Study',
      work: 'Work',
      rest: 'Rest',
      entertainment: 'Entertainment',
      visitCount: 'Visit Count',
      turnover: 'Turnover',
      dealCount: 'Deal Count',
      creativity: 'Creativity'
    },
    system: {
      common: {
        status: {
          enable: 'Enable',
          disable: 'Disable'
        }
      },
      role: {
        title: 'Role List',
        roleName: 'Role Name',
        roleCode: 'Role Code',
        roleStatus: 'Role Status',
        roleDesc: 'Role Description',
        menuAuth: 'Menu Auth',
        buttonAuth: 'Button Auth',
        form: {
          roleName: 'Please enter role name',
          roleCode: 'Please enter role code',
          roleStatus: 'Please select role status',
          roleDesc: 'Please enter role description'
        },
        addRole: 'Add Role',
        editRole: 'Edit Role'
      },
      user: {
        title: 'User List',
        userName: 'User Name',
        userGender: 'Gender',
        nickname: 'Nick Name',
        userPhone: 'Phone Number',
        userEmail: 'Email',
        userStatus: 'User Status',
        userRole: 'User Role',
        form: {
          userName: 'Please enter user name',
          password: 'Please enter password',
          userGender: 'Please select gender',
          nickname: 'Please enter nick name',
          userPhone: 'Please enter phone number',
          userEmail: 'Please enter email',
          userStatus: 'Please select user status',
          userRole: 'Please select user role'
        },
        addUser: 'Add User',
        editUser: 'Edit User',
        gender: {
          unknown: 'Unknown',
          male: 'Male',
          female: 'Female'
        },
        password: 'Password',
        resetPwd: {
          title: 'Reset Password'
        }
      },
      menu: {
        home: 'Home',
        title: 'Menu List',
        id: 'ID',
        parentId: 'Parent ID',
        menuType: 'Menu Type',
        parentMenu: 'Parent Menu',
        menuName: 'Menu Name',
        routeName: 'Route Name',
        routePath: 'Route Path',
        pathParam: 'Path Param',
        layout: 'Layout Component',
        page: 'Page Component',
        i18nKey: 'I18n Key',
        icon: 'Icon',
        localIcon: 'Local Icon',
        iconTypeTitle: 'Icon Type',
        order: 'Order',
        constant: 'Constant',
        keepAlive: 'Keep Alive',
        href: 'Href',
        hideInMenu: 'Hide In Menu',
        activeMenu: 'Active Menu',
        multiTab: 'Multi Tab',
        fixedIndexInTab: 'Fixed Index In Tab',
        query: 'Query Params',
        button: 'Button',
        buttonCode: 'Button Code',
        buttonDesc: 'Button Desc',
        presetButton: {
          addAll: 'Add All',
          list: 'List',
          add: 'Add',
          edit: 'Edit',
          delete: 'Delete',
          batchDelete: 'Batch Delete'
        },
        menuStatus: 'Menu Status',
        form: {
          home: 'Please select home',
          menuType: 'Please select menu type',
          parentMenu: 'Please select parent menu',
          menuName: 'Please enter menu name',
          routeName: 'Please enter route name',
          routePath: 'Please enter route path',
          pathParam: 'Please enter path param',
          page: 'Please select page component',
          layout: 'Please select layout component',
          i18nKey: 'Please enter i18n key',
          icon: 'Please enter iconify name',
          localIcon: 'Please enter local icon name',
          order: 'Please enter order',
          keepAlive: 'Please select whether to cache route',
          href: 'Please enter href',
          hideInMenu: 'Please select whether to hide menu',
          activeMenu: 'Please select route name of the highlighted menu',
          multiTab: 'Please select whether to support multiple tabs',
          fixedInTab: 'Please select whether to fix in the tab',
          fixedIndexInTab: 'Please enter the index fixed in the tab',
          queryKey: 'Please enter route parameter Key',
          queryValue: 'Please enter route parameter Value',
          button: 'Please select whether it is a button',
          buttonCode: 'Please enter button code',
          buttonDesc: 'Please enter button description',
          menuStatus: 'Please select menu status'
        },
        addMenu: 'Add Menu',
        editMenu: 'Edit Menu',
        addChildMenu: 'Add Child Menu',
        type: {
          directory: 'Directory',
          menu: 'Menu',
          button: 'Button'
        },
        iconType: {
          iconify: 'Iconify Icon',
          local: 'Local Icon'
        },
        iconPicker: {
          title: 'Select Icon',
          search: 'Search icons...',
          empty: 'No icons found'
        }
      },
      dict: {
        title: 'Dictionary Type List',
        dictTypeName: 'Dictionary Name',
        dictTypeCode: 'Dictionary Type',
        dictType: 'Dictionary Type',
        status: 'Status',
        remark: 'Remark',
        typeForm: {
          dictTypeName: 'Please enter dictionary name',
          dictTypeCode: 'Please enter dictionary type',
          status: 'Please select status',
          remark: 'Please enter remark'
        },
        addDictType: 'Add Dictionary Type',
        editDictType: 'Edit Dictionary Type',
        viewDictData: 'View Dictionary Data',
        dictDataTitle: 'Dictionary Data List',
        dictLabel: 'Dictionary Label',
        dictValue: 'Dictionary Value',
        dictSort: 'Dictionary Sort',
        cssClass: 'CSS Class',
        listClass: 'List Class',
        isDefault: 'Is Default',
        dataForm: {
          dictType: 'Please select dictionary type',
          dictLabel: 'Please enter dictionary label',
          dictValue: 'Please enter dictionary value',
          dictSort: 'Please enter dictionary sort',
          cssClass: 'Please enter CSS class',
          listClass: 'Please enter list class',
          isDefault: 'Please select is default',
          status: 'Please select status'
        },
        addDictData: 'Add Dictionary Data',
        editDictData: 'Edit Dictionary Data',
        backToDictType: 'Back to Dictionary Type',
        validation: {
          dictNameMinLength: 'Dictionary name requires at least 2 characters',
          dictTypeMinLength: 'Dictionary type code requires at least 2 characters'
        }
      },
      job: {
        title: 'Scheduled Job List',
        jobName: 'Job Name',
        jobKey: 'Job Key',
        cronExpression: 'Schedule',
        triggerType: 'Trigger Type',
        triggerTypeCron: 'Cron Expression',
        triggerTypeInterval: 'Fixed Interval',
        interval: 'Interval',
        intervalValue: 'Interval Value',
        intervalUnit: 'Interval Unit',
        unitSeconds: 'Seconds',
        unitMinutes: 'Minutes',
        unitHours: 'Hours',
        unitDays: 'Days',
        presetEveryMinute: 'Every Minute',
        presetEveryHour: 'Every Hour',
        presetEveryDay: 'Every Day',
        presetEveryWeek: 'Every Week',
        presetEveryMonth: 'Every Month',
        presetEveryYear: 'Every Year',
        descEveryMinute: 'Runs every minute',
        descEveryHour: 'Runs every hour',
        descEveryDay: 'Runs daily at 00:00',
        descEveryWeek: 'Runs weekly on Monday at 00:00',
        jobArgs: 'Job Args',
        status: 'Status',
        concurrent: 'Concurrent',
        remark: 'Remark',
        concurrentAllow: 'Allow',
        concurrentForbid: 'Forbid',
        form: {
          jobName: 'Enter job name',
          jobKey: 'Select job key',
          cronExpression: 'Enter cron expression',
          jobArgs: 'Enter job args JSON',
          status: 'Select status',
          concurrent: 'Select concurrent strategy',
          remark: 'Enter remark',
          intervalValue: 'Enter interval value',
          intervalUnit: 'Select unit'
        },
        addJob: 'Add Job',
        editJob: 'Edit Job',
        runNow: 'Run Now',
        enableJob: 'Enable',
        disableJob: 'Disable',
        runConfirm: 'Confirm to run this job immediately?',
        enableConfirm: 'Confirm to enable this job?',
        disableConfirm: 'Confirm to disable this job?',
        validation: {
          cronInvalid: 'Invalid cron expression'
        }
      },
      jobLog: {
        title: 'Job Log List',
        jobName: 'Job Name',
        jobKey: 'Job Key',
        status: 'Status',
        errorMsg: 'Error Message',
        startTime: 'Start Time',
        endTime: 'End Time',
        duration: 'Duration(ms)',
        statusSuccess: 'Success',
        statusFailed: 'Failed',
        statusRunning: 'Running',
        clean: 'Clean Logs',
        cleanConfirm: 'Confirm to clean logs older than 30 days?',
        cleanSuccess: 'Logs cleaned successfully'
      },
      dept: {
        title: 'Dept List',
        deptName: 'Dept Name',
        parentId: 'Parent Dept',
        orderNum: 'Order',
        leader: 'Leader',
        phone: 'Phone',
        email: 'Email',
        deptStatus: 'Dept Status',
        createTime: 'Create Time',
        form: {
          parentId: 'Please select parent dept',
          deptName: 'Please enter dept name',
          orderNum: 'Please enter order',
          leader: 'Please enter leader',
          phone: 'Please enter phone',
          email: 'Please enter email',
          deptStatus: 'Please select dept status'
        },
        addDept: 'Add Dept',
        addChildDept: 'Add Child Dept',
        editDept: 'Edit Dept',
        validation: {
          deptNameMinLength: 'Dept name requires at least 2 characters'
        }
      },
      file: {
        title: 'File Management',
        fileName: 'File Name',
        fileType: 'Type',
        fileSize: 'Size',
        uploader: 'Uploader',
        uploadTime: 'Upload Time',
        copyLink: 'Copy Link',
        confirmDelete: 'Are you sure you want to delete this file?',
        linkCopied: 'Link copied',
        uploadFile: 'Upload File',
        fileList: 'File List',
        fileNamePlaceholder: 'Enter file name',
        fileTypePlaceholder: 'e.g. .jpg, .pdf',
        uploadDraggerTip: 'Click or drag files to this area to upload',
        uploadDraggerDesc: 'Support common formats: images, documents, archives, etc.'
      }
    },
    ai: {
      chat: {
        title: 'AI Chat',
        newChat: 'New Chat',
        searchPlaceholder: 'Search conversations...',
        noConversation: 'No conversations',
        deleteTitle: 'Delete Chat',
        deleteContent: 'Are you sure you want to delete this chat? This action cannot be undone.',
        welcomeTitle: 'How can I help you?',
        welcomeDesc: 'I am your AI assistant, I can answer questions, write code, translate text, analyze data, etc.',
        inputPlaceholder: 'Message AI assistant...',
        inputHint: 'AI may produce inaccurate content, please verify carefully',
        thinking: 'Thinking...',
        noModel: 'No models available, please configure in model management',
        copy: 'Copy',
        copied: 'Copied',
        regenerate: 'Regenerate',
        editPlaceholder: 'Edit message...',
        editTip: 'Enter to submit · Esc to cancel',
        quickCode: 'Write code for me',
        quickTranslate: 'Translate text',
        quickAnalyze: 'Analyze a problem',
        quickArticle: 'Write an article',
        quickCodePrompt: 'Write code for me: ',
        quickTranslatePrompt: 'Translate the following: ',
        quickAnalyzePrompt: 'Analyze this problem: ',
        quickArticlePrompt: 'Write an article about '
      },
      provider: {
        title: 'Model Management',
        name: 'Name',
        code: 'Code',
        apiKey: 'API Key',
        baseUrl: 'Base URL',
        models: 'Available Models',
        status: 'Status',
        addProvider: 'Add Model Config',
        editProvider: 'Edit Model Config',
        form: {
          code: 'e.g. openai, deepseek, anthropic',
          name: 'e.g. OpenAI, DeepSeek',
          apiKey: 'sk-...',
          apiKeyEdit: 'Leave empty to keep current',
          baseUrl: 'Leave empty for default',
          model: 'e.g. gpt-4o, doubao-pro-32k'
        },
        addModel: 'Add Model',
        testConnectivity: 'Test Connectivity',
        testSuccess: 'Connectivity test successful',
        testFailed: 'Connectivity test failed',
        testNoModel: 'Please enter model name first',
        testNoCode: 'Please enter provider code first',
        modelTestSuccess: 'Model {name} connectivity test successful'
      }
    }
  },
  form: {
    required: 'Cannot be empty',
    userName: {
      required: 'Please enter user name',
      invalid: 'Username must be 2-16 characters: Chinese, letters, numbers, underscore or hyphen'
    },
    phone: {
      required: 'Please enter phone number',
      invalid: 'Phone number format is incorrect'
    },
    pwd: {
      required: 'Please enter password',
      invalid: 'Password must be 6-20 characters with uppercase, lowercase and digit'
    },
    confirmPwd: {
      required: 'Please enter password again',
      invalid: 'The two passwords are inconsistent'
    },
    code: {
      required: 'Please enter verification code',
      invalid: 'Verification code format is incorrect'
    },
    email: {
      required: 'Please enter email',
      invalid: 'Email format is incorrect'
    }
  },
  dropdown: {
    closeCurrent: 'Close Current',
    closeOther: 'Close Other',
    closeLeft: 'Close Left',
    closeRight: 'Close Right',
    closeAll: 'Close All',
    pin: 'Pin Tab',
    unpin: 'Unpin Tab'
  },
  icon: {
    themeConfig: 'Theme Configuration',
    themeSchema: 'Theme Schema',
    lang: 'Switch Language',
    fullscreen: 'Fullscreen',
    fullscreenExit: 'Exit Fullscreen',
    reload: 'Reload Page',
    collapse: 'Collapse Menu',
    expand: 'Expand Menu',
    pin: 'Pin',
    unpin: 'Unpin'
  },
  datatable: {
    itemCount: 'Total {total} items',
    fixed: {
      left: 'Left Fixed',
      right: 'Right Fixed',
      unFixed: 'Unfixed'
    }
  },
  errorCode: {
    UNAUTHORIZED: 'Session expired, please login again',
    INVALID_CREDENTIALS: 'Invalid username or password',
    TOKEN_EXPIRED: 'Session expired, please login again',
    ACCOUNT_DISABLED: 'Account has been disabled',
    UNSUPPORTED_LOGIN_TYPE: 'Unsupported login method',
    AI_PROVIDER_NOT_FOUND: 'AI provider not found',
    AI_CONVERSATION_NOT_FOUND: 'AI conversation not found',
    AI_MODEL_NOT_CONFIGURED: 'AI model not configured, please add in model management',
    AI_PROVIDER_DUPLICATE: 'Provider code already exists',
    AI_TEST_NO_MODEL: 'No model configured',
    AI_TEST_NO_API_KEY: 'Missing API Key, please fill in or select a saved provider',
    AI_TEST_FAILED: 'Connectivity test failed',
    INVALID_PASSWORD_FORMAT: 'Password must be 6-20 characters with uppercase, lowercase and digit',
    INCORRECT_OLD_PASSWORD: 'Current password is incorrect'
  }
};

export default local;
