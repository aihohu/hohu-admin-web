const local: App.I18n.Schema = {
  system: {
    title: 'HoHu 管理系统',
    updateTitle: '系统版本更新通知',
    updateContent: '检测到系统有新版本发布，是否立即刷新页面？',
    updateConfirm: '立即刷新',
    updateCancel: '稍后再说'
  },
  common: {
    action: '操作',
    add: '新增',
    addSuccess: '添加成功',
    backToHome: '返回首页',
    batchDelete: '批量删除',
    cancel: '取消',
    close: '关闭',
    check: '勾选',
    selectAll: '全选',
    expandColumn: '展开列',
    columnSetting: '列设置',
    config: '配置',
    confirm: '确认',
    delete: '删除',
    deleteSuccess: '删除成功',
    confirmDelete: '确认删除吗？',
    edit: '编辑',
    warning: '警告',
    error: '错误',
    index: '序号',
    keywordSearch: '请输入关键词搜索',
    logout: '退出登录',
    logoutConfirm: '确认退出登录吗？',
    lookForward: '敬请期待',
    modify: '修改',
    modifySuccess: '修改成功',
    noData: '无数据',
    operate: '操作',
    pleaseCheckValue: '请检查输入的值是否合法',
    refresh: '刷新',
    reset: '重置',
    search: '搜索',
    switch: '切换',
    tip: '提示',
    trigger: '触发',
    update: '更新',
    updateSuccess: '更新成功',
    userCenter: '个人中心',
    yesOrNo: {
      yes: '是',
      no: '否'
    },
    saveSuccess: '保存成功',
    clear: '清除'
  },
  request: {
    logout: '请求失败后登出用户',
    logoutMsg: '用户状态失效，请重新登录',
    logoutWithModal: '请求失败后弹出模态框再登出用户',
    logoutWithModalMsg: '用户状态失效，请重新登录',
    refreshToken: '请求的token已过期，刷新token',
    tokenExpired: 'token已过期'
  },
  theme: {
    themeDrawerTitle: '主题配置',
    tabs: {
      appearance: '外观',
      layout: '布局',
      general: '通用',
      preset: '预设'
    },
    appearance: {
      themeSchema: {
        title: '主题模式',
        light: '亮色模式',
        dark: '暗黑模式',
        auto: '跟随系统'
      },
      grayscale: '灰色模式',
      colourWeakness: '色弱模式',
      themeColor: {
        title: '主题颜色',
        primary: '主色',
        info: '信息色',
        success: '成功色',
        warning: '警告色',
        error: '错误色',
        followPrimary: '跟随主色'
      },
      themeRadius: {
        title: '主题圆角'
      },
      recommendColor: '应用推荐算法的颜色',
      recommendColorDesc: '推荐颜色的算法参照',
      preset: {
        title: '主题预设',
        apply: '应用',
        applySuccess: '预设应用成功',
        default: {
          name: '默认预设',
          desc: 'HoHu 默认主题预设'
        },
        dark: {
          name: '暗色预设',
          desc: '适用于夜间使用的暗色主题预设'
        },
        compact: {
          name: '紧凑型',
          desc: '适用于小屏幕的紧凑布局预设'
        },
        azir: {
          name: 'Azir的预设',
          desc: '是 Azir 比较喜欢的莫兰迪色系冷淡风'
        }
      }
    },
    layout: {
      layoutMode: {
        title: '布局模式',
        vertical: '左侧菜单模式',
        'vertical-mix': '左侧菜单混合模式',
        'vertical-hybrid-header-first': '左侧混合-顶部优先',
        horizontal: '顶部菜单模式',
        'top-hybrid-sidebar-first': '顶部混合-侧边优先',
        'top-hybrid-header-first': '顶部混合-顶部优先',
        vertical_detail: '左侧菜单布局，菜单在左，内容在右。',
        'vertical-mix_detail': '左侧双菜单布局，一级菜单在左侧深色区域，二级菜单在左侧浅色区域。',
        'vertical-hybrid-header-first_detail':
          '左侧混合布局，一级菜单在顶部，二级菜单在左侧深色区域，三级菜单在左侧浅色区域。',
        horizontal_detail: '顶部菜单布局，菜单在顶部，内容在下方。',
        'top-hybrid-sidebar-first_detail': '顶部混合布局，一级菜单在左侧，二级菜单在顶部。',
        'top-hybrid-header-first_detail': '顶部混合布局，一级菜单在顶部，二级菜单在左侧。'
      },
      tab: {
        title: '标签栏设置',
        visible: '显示标签栏',
        cache: '标签栏信息缓存',
        cacheTip: '一键开启/关闭全局 keepalive',
        height: '标签栏高度',
        mode: {
          title: '标签栏风格',
          slider: '滑块风格',
          chrome: '谷歌风格',
          button: '按钮风格'
        },
        closeByMiddleClick: '鼠标中键关闭标签页',
        closeByMiddleClickTip: '启用后可以使用鼠标中键点击标签页进行关闭'
      },
      header: {
        title: '头部设置',
        height: '头部高度',
        breadcrumb: {
          visible: '显示面包屑',
          showIcon: '显示面包屑图标'
        }
      },
      sider: {
        title: '侧边栏设置',
        inverted: '深色侧边栏',
        width: '侧边栏宽度',
        collapsedWidth: '侧边栏折叠宽度',
        mixWidth: '混合布局侧边栏宽度',
        mixCollapsedWidth: '混合布局侧边栏折叠宽度',
        mixChildMenuWidth: '混合布局子菜单宽度',
        autoSelectFirstMenu: '自动选择第一个子菜单',
        autoSelectFirstMenuTip: '点击一级菜单时，自动选择并导航到第一个子菜单的最深层级'
      },
      footer: {
        title: '底部设置',
        visible: '显示底部',
        fixed: '固定底部',
        height: '底部高度',
        right: '底部居右'
      },
      content: {
        title: '内容区域设置',
        scrollMode: {
          title: '滚动模式',
          tip: '主题滚动仅 main 部分滚动，外层滚动可携带头部底部一起滚动',
          wrapper: '外层滚动',
          content: '主体滚动'
        },
        page: {
          animate: '页面切换动画',
          mode: {
            title: '页面切换动画类型',
            'fade-slide': '滑动',
            fade: '淡入淡出',
            'fade-bottom': '底部消退',
            'fade-scale': '缩放消退',
            'zoom-fade': '渐变',
            'zoom-out': '闪现',
            none: '无'
          }
        },
        fixedHeaderAndTab: '固定头部和标签栏'
      }
    },
    general: {
      title: '通用设置',
      watermark: {
        title: '水印设置',
        visible: '显示全屏水印',
        text: '自定义水印文本',
        enableUserName: '启用用户名水印',
        enableTime: '显示当前时间',
        timeFormat: '时间格式'
      },
      multilingual: {
        title: '多语言设置',
        visible: '显示多语言按钮'
      },
      globalSearch: {
        title: '全局搜索设置',
        visible: '显示全局搜索按钮'
      }
    },
    configOperation: {
      copyConfig: '复制配置',
      copySuccessMsg: '复制成功，请替换 src/theme/settings.ts 中的变量 themeSettings',
      resetConfig: '重置配置',
      resetSuccessMsg: '重置成功'
    }
  },
  route: {
    login: '登录',
    403: '无权限',
    404: '页面不存在',
    500: '服务器错误',
    'iframe-page': '外链页面',
    home: '首页',
    profile: '个人中心',
    system: '系统管理',
    system_user: '用户管理',
    system_role: '角色管理',
    system_menu: '菜单管理',
    system_dict: '字典管理',
    system_dict_data: '字典数据',
    system_dept: '部门管理',
    system_file: '文件管理',
    system_job: '定时任务',
    'system_job-log': '任务日志',
    system_config: '系统设置',
    auth: '权限管理',
    task: '任务中心',
    'task_job-log': '任务日志',
    ai: 'AI 助手',
    ai_chat: 'AI 对话',
    ai_provider: '模型管理'
  },
  page: {
    login: {
      common: {
        loginOrRegister: '登录 / 注册',
        userNamePlaceholder: '请输入用户名',
        phonePlaceholder: '请输入手机号',
        codePlaceholder: '请输入验证码',
        passwordPlaceholder: '请输入密码',
        confirmPasswordPlaceholder: '请再次输入密码',
        codeLogin: '验证码登录',
        confirm: '确定',
        back: '返回',
        validateSuccess: '验证成功',
        loginSuccess: '登录成功',
        welcomeBack: '欢迎回来，{userName} ！'
      },
      pwdLogin: {
        title: '密码登录',
        rememberMe: '记住我',
        forgetPassword: '忘记密码？',
        register: '注册账号',
        otherAccountLogin: '其他账号登录',
        otherLoginMode: '其他登录方式',
        superAdmin: '超级管理员',
        admin: '管理员',
        user: '普通用户'
      },
      codeLogin: {
        title: '验证码登录',
        getCode: '获取验证码',
        reGetCode: '{time}秒后重新获取',
        sendCodeSuccess: '验证码发送成功',
        imageCodePlaceholder: '请输入图片验证码'
      },
      register: {
        title: '注册账号',
        agreement: '我已经仔细阅读并接受',
        protocol: '《用户协议》',
        policy: '《隐私权政策》'
      },
      resetPwd: {
        title: '重置密码'
      },
      bindWeChat: {
        title: '绑定微信'
      }
    },
    profile: {
      title: '个人中心',
      baseInfo: '基本信息',
      newPassword: '新密码',
      confirmPassword: '确认密码',
      passwordMinLength: '密码长度不能少于6位',
      oldPassword: '当前密码',
      oldPasswordPlaceholder: '请输入当前密码',
      confirmPasswordPlaceholder: '请再次输入新密码',
      registerTime: '注册时间',
      confirmPwdMismatch: '两次密码输入不一致',
      passwordChangeSuccess: '密码修改成功',
      changeAvatar: '更换头像',
      presetAvatar: '选择预设头像',
      uploadAvatar: '上传自定义头像'
    },
    home: {
      branchDesc: '欢迎使用HoHu，HoHu是基于FastAPI，SQLAlchemy，Vue3 & Naiveui 的前后端分离权限管理系统',
      greeting: '早安，{userName}, 今天又是充满活力的一天!',
      weatherDesc: '今日多云转晴，20℃ - 25℃!',
      projectCount: '项目数',
      todo: '待办',
      message: '消息',
      downloadCount: '下载量',
      registerCount: '注册量',
      schedule: '作息安排',
      study: '学习',
      work: '工作',
      rest: '休息',
      entertainment: '娱乐',
      visitCount: '访问量',
      turnover: '成交额',
      dealCount: '成交量',
      creativity: '创意'
    },
    system: {
      common: {
        status: {
          enable: '启用',
          disable: '禁用'
        }
      },
      role: {
        title: '角色列表',
        roleName: '角色名称',
        roleCode: '角色编码',
        roleStatus: '角色状态',
        roleDesc: '角色描述',
        menuAuth: '菜单权限',
        buttonAuth: '按钮权限',
        form: {
          roleName: '请输入角色名称',
          roleCode: '请输入角色编码',
          roleStatus: '请选择角色状态',
          roleDesc: '请输入角色描述'
        },
        addRole: '新增角色',
        editRole: '编辑角色'
      },
      user: {
        title: '用户列表',
        userName: '用户名',
        userGender: '性别',
        nickname: '昵称',
        userPhone: '手机号',
        userEmail: '邮箱',
        userStatus: '用户状态',
        userRole: '用户角色',
        form: {
          userName: '请输入用户名',
          password: '请输入密码',
          userGender: '请选择性别',
          nickname: '请输入昵称',
          userPhone: '请输入手机号',
          userEmail: '请输入邮箱',
          userStatus: '请选择用户状态',
          userRole: '请选择用户角色'
        },
        addUser: '新增用户',
        editUser: '编辑用户',
        gender: {
          unknown: '未知',
          male: '男',
          female: '女'
        },
        password: '密码',
        resetPwd: {
          title: '重置密码'
        }
      },
      menu: {
        home: '首页',
        title: '菜单列表',
        id: 'ID',
        parentId: '父级菜单ID',
        menuType: '菜单类型',
        parentMenu: '上级菜单',
        menuName: '菜单名称',
        routeName: '路由名称',
        routePath: '路由路径',
        pathParam: '路径参数',
        layout: '布局',
        page: '页面组件',
        i18nKey: '国际化key',
        icon: '图标',
        localIcon: '本地图标',
        iconTypeTitle: '图标类型',
        order: '排序',
        constant: '常量路由',
        keepAlive: '缓存路由',
        href: '外链',
        hideInMenu: '隐藏菜单',
        activeMenu: '高亮的菜单',
        multiTab: '支持多页签',
        fixedIndexInTab: '固定在页签中的序号',
        query: '路由参数',
        button: '按钮',
        buttonCode: '按钮编码',
        buttonDesc: '按钮描述',
        presetButton: {
          addAll: '一键添加',
          list: '查询',
          add: '新增',
          edit: '修改',
          delete: '删除',
          batchDelete: '批量删除'
        },
        menuStatus: '菜单状态',
        form: {
          home: '请选择首页',
          menuType: '请选择菜单类型',
          parentMenu: '请选择上级菜单',
          menuName: '请输入菜单名称',
          routeName: '请输入路由名称',
          routePath: '请输入路由路径',
          pathParam: '请输入路径参数',
          page: '请选择页面组件',
          layout: '请选择布局组件',
          i18nKey: '请输入国际化key',
          icon: '请输入图标',
          localIcon: '请选择本地图标',
          order: '请输入排序',
          keepAlive: '请选择是否缓存路由',
          href: '请输入外链',
          hideInMenu: '请选择是否隐藏菜单',
          activeMenu: '请选择高亮的菜单的路由名称',
          multiTab: '请选择是否支持多标签',
          fixedInTab: '请选择是否固定在页签中',
          fixedIndexInTab: '请输入固定在页签中的序号',
          queryKey: '请输入路由参数Key',
          queryValue: '请输入路由参数Value',
          button: '请选择是否按钮',
          buttonCode: '请输入按钮编码',
          buttonDesc: '请输入按钮描述',
          menuStatus: '请选择菜单状态'
        },
        addMenu: '新增菜单',
        editMenu: '编辑菜单',
        addChildMenu: '新增子菜单',
        type: {
          directory: '目录',
          menu: '菜单',
          button: '按钮'
        },
        iconType: {
          iconify: 'iconify图标',
          local: '本地图标'
        },
        iconPicker: {
          title: '选择图标',
          search: '搜索图标...',
          empty: '未找到图标'
        }
      },
      dict: {
        title: '字典类型列表',
        dictTypeName: '字典名称',
        dictTypeCode: '字典类型',
        dictType: '字典类型',
        status: '状态',
        remark: '备注',
        typeForm: {
          dictTypeName: '请输入字典名称',
          dictTypeCode: '请输入字典类型',
          status: '请选择状态',
          remark: '请输入备注'
        },
        addDictType: '新增字典类型',
        editDictType: '编辑字典类型',
        viewDictData: '查看字典数据',
        dictDataTitle: '字典数据列表',
        dictLabel: '字典标签',
        dictValue: '字典键值',
        dictSort: '字典排序',
        cssClass: '样式属性',
        listClass: '表格回显样式',
        isDefault: '是否默认',
        dataForm: {
          dictType: '请选择字典类型',
          dictLabel: '请输入字典标签',
          dictValue: '请输入字典键值',
          dictSort: '请输入字典排序',
          cssClass: '请输入样式属性',
          listClass: '请输入表格回显样式',
          isDefault: '请选择是否默认',
          status: '请选择状态'
        },
        addDictData: '新增字典数据',
        editDictData: '编辑字典数据',
        backToDictType: '返回字典类型',
        validation: {
          dictNameMinLength: '字典名称至少需要2个字符',
          dictTypeMinLength: '字典类型编码至少需要2个字符'
        }
      },
      job: {
        title: '定时任务列表',
        jobName: '任务名称',
        jobKey: '任务标识',
        cronExpression: '调度表达式',
        triggerType: '调度类型',
        triggerTypeCron: 'Cron 表达式',
        triggerTypeInterval: '固定间隔',
        interval: '执行间隔',
        intervalValue: '间隔值',
        intervalUnit: '间隔单位',
        unitSeconds: '秒',
        unitMinutes: '分钟',
        unitHours: '小时',
        unitDays: '天',
        presetEveryMinute: '每分钟',
        presetEveryHour: '每小时',
        presetEveryDay: '每天',
        presetEveryWeek: '每周',
        presetEveryMonth: '每月',
        presetEveryYear: '每年',
        descEveryMinute: '每分钟执行一次',
        descEveryHour: '每小时执行一次',
        descEveryDay: '每天 00:00 执行',
        descEveryWeek: '每周一 00:00 执行',
        jobArgs: '任务参数',
        status: '状态',
        concurrent: '并发策略',
        remark: '备注',
        concurrentAllow: '允许',
        concurrentForbid: '禁止',
        form: {
          jobName: '请输入任务名称',
          jobKey: '请选择任务标识',
          cronExpression: '请输入cron表达式',
          jobArgs: '请输入任务参数JSON',
          status: '请选择状态',
          concurrent: '请选择并发策略',
          remark: '请输入备注',
          intervalValue: '请输入间隔值',
          intervalUnit: '请选择单位'
        },
        addJob: '新增定时任务',
        editJob: '编辑定时任务',
        runNow: '立即执行',
        enableJob: '启用',
        disableJob: '停用',
        runConfirm: '确认立即执行该任务？',
        enableConfirm: '确认启用该任务？',
        disableConfirm: '确认停用该任务？',
        validation: {
          cronInvalid: 'cron表达式格式不正确'
        }
      },
      jobLog: {
        title: '任务日志列表',
        jobName: '任务名称',
        jobKey: '任务标识',
        status: '执行状态',
        errorMsg: '异常信息',
        startTime: '开始时间',
        endTime: '结束时间',
        duration: '耗时(ms)',
        statusSuccess: '成功',
        statusFailed: '失败',
        statusRunning: '执行中',
        clean: '清理日志',
        cleanConfirm: '确认清理30天前的日志？',
        cleanSuccess: '日志清理成功'
      },
      config: {
        title: '系统配置列表',
        configName: '配置名称',
        configKey: '配置键',
        configValue: '配置值',
        configType: '配置类型',
        configGroup: '配置分组',
        configStatus: '配置状态',
        isPublic: '公开访问',
        remark: '备注',
        form: {
          configName: '请输入配置名称',
          configKey: '请输入配置键',
          configValue: '请输入配置值',
          configType: '请选择配置类型',
          configGroup: '请输入配置分组',
          configStatus: '请选择配置状态',
          isPublic: '是否公开访问（无需登录即可获取）',
          remark: '请输入备注'
        },
        addConfig: '新增配置',
        editConfig: '编辑配置',
        typeText: '字符串',
        typeRichtext: '富文本',
        typeFile: '文件'
      },
      dept: {
        title: '部门列表',
        deptName: '部门名称',
        parentId: '上级部门',
        orderNum: '排序',
        leader: '负责人',
        phone: '联系电话',
        email: '邮箱',
        deptStatus: '部门状态',
        createTime: '创建时间',
        form: {
          parentId: '请选择上级部门',
          deptName: '请输入部门名称',
          orderNum: '请输入排序',
          leader: '请输入负责人',
          phone: '请输入联系电话',
          email: '请输入邮箱',
          deptStatus: '请选择部门状态'
        },
        addDept: '新增部门',
        addChildDept: '新增子部门',
        editDept: '编辑部门',
        validation: {
          deptNameMinLength: '部门名称至少需要2个字符'
        }
      },
      file: {
        title: '文件管理',
        fileName: '文件名',
        fileType: '类型',
        fileSize: '大小',
        uploader: '上传者',
        uploadTime: '上传时间',
        copyLink: '复制链接',
        confirmDelete: '确认删除该文件？',
        linkCopied: '链接已复制',
        uploadFile: '上传文件',
        fileList: '文件列表',
        fileNamePlaceholder: '请输入文件名',
        fileTypePlaceholder: '如 .jpg, .pdf',
        uploadDraggerTip: '点击或拖拽文件到此区域上传',
        uploadDraggerDesc: '支持图片、文档、压缩包等常见文件格式'
      }
    },
    ai: {
      chat: {
        title: 'AI 对话',
        newChat: '新对话',
        searchPlaceholder: '搜索对话...',
        noConversation: '暂无对话',
        deleteTitle: '删除对话',
        deleteContent: '确定要删除这个对话吗？删除后不可恢复。',
        welcomeTitle: '有什么可以帮你的？',
        welcomeDesc: '我是你的 AI 助手，可以回答问题、写代码、翻译文本、分析数据等',
        inputPlaceholder: '给 AI 助手发消息...',
        inputHint: 'AI 可能产生不准确的内容，请注意甄别',
        thinking: '思考中...',
        noModel: '暂无可用模型，请在模型管理中配置',
        copy: '复制',
        copied: '已复制',
        regenerate: '重新生成',
        editPlaceholder: '编辑消息...',
        editTip: 'Enter 提交 · Esc 取消',
        quickCode: '帮我写一段代码',
        quickTranslate: '翻译一段文字',
        quickAnalyze: '帮我分析一个问题',
        quickArticle: '帮我写一篇文章',
        quickCodePrompt: '帮我写一段代码：',
        quickTranslatePrompt: '帮我翻译以下内容：',
        quickAnalyzePrompt: '帮我分析以下问题：',
        quickArticlePrompt: '帮我写一篇关于'
      },
      provider: {
        title: '模型管理',
        name: '名称',
        code: '编码',
        apiKey: 'API Key',
        baseUrl: 'Base URL',
        models: '可用模型',
        status: '状态',
        addProvider: '添加模型配置',
        editProvider: '编辑模型配置',
        form: {
          code: '如 openai、deepseek、anthropic',
          name: '如 OpenAI、DeepSeek',
          apiKey: 'sk-...',
          apiKeyEdit: '留空则不修改',
          baseUrl: '留空使用默认地址',
          model: '如 gpt-4o、doubao-pro-32k'
        },
        addModel: '添加模型',
        testConnectivity: '测试连通性',
        testSuccess: '连通性测试成功',
        testFailed: '连通性测试失败',
        testNoModel: '请先输入模型名称',
        testNoCode: '请先填写提供商编码',
        modelTestSuccess: '模型 {name} 连通性测试成功'
      }
    }
  },
  form: {
    required: '不能为空',
    userName: {
      required: '请输入用户名',
      invalid: '用户名必须为2-16位中文、字母、数字、下划线或减号'
    },
    phone: {
      required: '请输入手机号',
      invalid: '手机号格式不正确'
    },
    pwd: {
      required: '请输入密码',
      invalid: '密码必须为6-20位，且包含大写字母、小写字母和数字'
    },
    confirmPwd: {
      required: '请输入确认密码',
      invalid: '两次输入密码不一致'
    },
    code: {
      required: '请输入验证码',
      invalid: '验证码格式不正确'
    },
    email: {
      required: '请输入邮箱',
      invalid: '邮箱格式不正确'
    }
  },
  dropdown: {
    closeCurrent: '关闭',
    closeOther: '关闭其它',
    closeLeft: '关闭左侧',
    closeRight: '关闭右侧',
    closeAll: '关闭所有',
    pin: '固定标签',
    unpin: '取消固定'
  },
  icon: {
    themeConfig: '主题配置',
    themeSchema: '主题模式',
    lang: '切换语言',
    fullscreen: '全屏',
    fullscreenExit: '退出全屏',
    reload: '刷新页面',
    collapse: '折叠菜单',
    expand: '展开菜单',
    pin: '固定',
    unpin: '取消固定'
  },
  datatable: {
    itemCount: '共 {total} 条',
    fixed: {
      left: '左固定',
      right: '右固定',
      unFixed: '取消固定'
    }
  },
  errorCode: {
    UNAUTHORIZED: '登录已过期，请重新登录',
    INVALID_CREDENTIALS: '用户名或密码错误',
    TOKEN_EXPIRED: '登录已过期，请重新登录',
    ACCOUNT_DISABLED: '账号已被禁用',
    UNSUPPORTED_LOGIN_TYPE: '不支持的登录方式',
    AI_PROVIDER_NOT_FOUND: 'AI 提供商不存在',
    AI_CONVERSATION_NOT_FOUND: 'AI 会话不存在',
    AI_MODEL_NOT_CONFIGURED: 'AI 模型未配置，请先在模型管理中添加配置',
    AI_PROVIDER_DUPLICATE: '提供商标识已存在',
    AI_TEST_NO_MODEL: '未配置可用模型',
    AI_TEST_NO_API_KEY: '缺少 API Key，请填写或选择已保存的提供商',
    AI_TEST_FAILED: '连通性测试失败',
    INVALID_PASSWORD_FORMAT: '密码必须为6-20位，且包含大写字母、小写字母和数字',
    INCORRECT_OLD_PASSWORD: '当前密码不正确'
  }
};

export default local;
