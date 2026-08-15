/** The global namespace for the app */
declare namespace App {
  /** Theme namespace */
  namespace Theme {
    type ColorPaletteNumber = import('@sa/color').ColorPaletteNumber;

    /** NaiveUI theme overrides that can be specified in preset */
    type NaiveUIThemeOverride = import('naive-ui').GlobalThemeOverrides;

    /** Theme setting */
    interface ThemeSetting {
      /** Theme scheme */
      themeScheme: UnionKey.ThemeScheme;
      /** grayscale mode */
      grayscale: boolean;
      /** colour weakness mode */
      colourWeakness: boolean;
      /** Whether to recommend color */
      recommendColor: boolean;
      /** Theme color */
      themeColor: string;
      /** Theme radius */
      themeRadius: number;
      /** Other color */
      otherColor: OtherColor;
      /** Whether info color is followed by the primary color */
      isInfoFollowPrimary: boolean;
      /** Layout */
      layout: {
        /** Layout mode */
        mode: UnionKey.ThemeLayoutMode;
        /** Scroll mode */
        scrollMode: UnionKey.ThemeScrollMode;
      };
      /** Page */
      page: {
        /** Whether to show the page transition */
        animate: boolean;
        /** Page animate mode */
        animateMode: UnionKey.ThemePageAnimateMode;
      };
      /** Header */
      header: {
        /** Header height */
        height: number;
        /** Header breadcrumb */
        breadcrumb: {
          /** Whether to show the breadcrumb */
          visible: boolean;
          /** Whether to show the breadcrumb icon */
          showIcon: boolean;
        };
        /** Multilingual */
        multilingual: {
          /** Whether to show the multilingual */
          visible: boolean;
        };
        globalSearch: {
          /** Whether to show the GlobalSearch */
          visible: boolean;
        };
      };
      /** Tab */
      tab: {
        /** Whether to show the tab */
        visible: boolean;
        /**
         * Whether to cache the tab
         *
         * If cache, the tabs will get from the local storage when the page is refreshed
         */
        cache: boolean;
        /** Tab height */
        height: number;
        /** Tab mode */
        mode: UnionKey.ThemeTabMode;
        /** Whether to close tab by middle click */
        closeTabByMiddleClick: boolean;
      };
      /** Fixed header and tab */
      fixedHeaderAndTab: boolean;
      /** Sider */
      sider: {
        /** Inverted sider */
        inverted: boolean;
        /** Sider width */
        width: number;
        /** Collapsed sider width */
        collapsedWidth: number;
        /** Sider width when the layout is 'vertical-mix', 'top-hybrid-sidebar-first', or 'top-hybrid-header-first' */
        mixWidth: number;
        /**
         * Collapsed sider width when the layout is 'vertical-mix', 'top-hybrid-sidebar-first', or
         * 'top-hybrid-header-first'
         */
        mixCollapsedWidth: number;
        /** Child menu width when the layout is 'vertical-mix', 'top-hybrid-sidebar-first', or 'top-hybrid-header-first' */
        mixChildMenuWidth: number;
        /** Whether to auto select the first submenu */
        autoSelectFirstMenu: boolean;
      };
      /** Footer */
      footer: {
        /** Whether to show the footer */
        visible: boolean;
        /** Whether fixed the footer */
        fixed: boolean;
        /** Footer height */
        height: number;
        /**
         * Whether float the footer to the right when the layout is 'top-hybrid-sidebar-first' or
         * 'top-hybrid-header-first'
         */
        right: boolean;
      };
      /** Watermark */
      watermark: {
        /** Whether to show the watermark */
        visible: boolean;
        /** Watermark text */
        text: string;
        /** Whether to use user name as watermark text */
        enableUserName: boolean;
        /** Whether to use current time as watermark text */
        enableTime: boolean;
        /** Time format for watermark text */
        timeFormat: string;
      };
      /** define some theme settings tokens, will transform to css variables */
      tokens: {
        light: ThemeSettingToken;
        dark?: {
          [K in keyof ThemeSettingToken]?: Partial<ThemeSettingToken[K]>;
        };
      };
    }

    interface OtherColor {
      info: string;
      success: string;
      warning: string;
      error: string;
    }

    interface ThemeColor extends OtherColor {
      primary: string;
    }

    type ThemeColorKey = keyof ThemeColor;

    type ThemePaletteColor = {
      [key in ThemeColorKey | `${ThemeColorKey}-${ColorPaletteNumber}`]: string;
    };

    type BaseToken = Record<string, Record<string, string>>;

    interface ThemeSettingTokenColor {
      /** the progress bar color, if not set, will use the primary color */
      nprogress?: string;
      container: string;
      layout: string;
      inverted: string;
      'base-text': string;
    }

    interface ThemeSettingTokenBoxShadow {
      header: string;
      sider: string;
      tab: string;
    }

    interface ThemeSettingToken {
      colors: ThemeSettingTokenColor;
      boxShadow: ThemeSettingTokenBoxShadow;
    }

    type ThemeTokenColor = ThemePaletteColor & ThemeSettingTokenColor;

    /** Theme token CSS variables */
    type ThemeTokenCSSVars = {
      colors: ThemeTokenColor & { [key: string]: string };
      boxShadow: ThemeSettingTokenBoxShadow & { [key: string]: string };
    };
  }

  /** Global namespace */
  namespace Global {
    type VNode = import('vue').VNode;
    type RouteLocationNormalizedLoaded = import('vue-router').RouteLocationNormalizedLoaded;
    type RouteKey = import('@elegant-router/types').RouteKey;
    type RouteMap = import('@elegant-router/types').RouteMap;
    type RoutePath = import('@elegant-router/types').RoutePath;
    type LastLevelRouteKey = import('@elegant-router/types').LastLevelRouteKey;

    /** The router push options */
    type RouterPushOptions = {
      query?: Record<string, string>;
      params?: Record<string, string>;
      force?: boolean;
    };

    /** The global header props */
    interface HeaderProps {
      /** Whether to show the logo */
      showLogo?: boolean;
      /** Whether to show the menu toggler */
      showMenuToggler?: boolean;
      /** Whether to show the menu */
      showMenu?: boolean;
    }

    /** The global menu */
    type Menu = {
      /**
       * The menu key
       *
       * Equal to the route key
       */
      key: string;
      /** The menu label */
      label: string;
      /** The menu i18n key */
      i18nKey?: I18n.I18nKey | null;
      /** The route key */
      routeKey: RouteKey;
      /** The route path */
      routePath: RoutePath;
      /** The menu icon */
      icon?: () => VNode;
      /** The menu children */
      children?: Menu[];
    };

    type Breadcrumb = Omit<Menu, 'children'> & {
      options?: Breadcrumb[];
    };

    /** Tab route */
    type TabRoute = Pick<RouteLocationNormalizedLoaded, 'name' | 'path' | 'meta'> &
      Partial<Pick<RouteLocationNormalizedLoaded, 'fullPath' | 'query' | 'matched'>>;

    /** The global tab */
    type Tab = {
      /** The tab id */
      id: string;
      /** The tab label */
      label: string;
      /**
       * The new tab label
       *
       * If set, the tab label will be replaced by this value
       */
      newLabel?: string;
      /**
       * The old tab label
       *
       * when reset the tab label, the tab label will be replaced by this value
       */
      oldLabel?: string;
      /** The tab route key */
      routeKey: LastLevelRouteKey;
      /** The tab route path */
      routePath: RouteMap[LastLevelRouteKey];
      /** The tab route full path */
      fullPath: string;
      /** The tab fixed index */
      fixedIndex?: number | null;
      /**
       * Tab icon
       *
       * Iconify icon
       */
      icon?: string;
      /**
       * Tab local icon
       *
       * Local icon
       */
      localIcon?: string;
      /** I18n key */
      i18nKey?: I18n.I18nKey | null;
    };

    /** Form rule */
    type FormRule = import('naive-ui').FormItemRule;

    /** The global dropdown key */
    type DropdownKey = 'closeCurrent' | 'closeOther' | 'closeLeft' | 'closeRight' | 'closeAll' | 'pin' | 'unpin';
  }

  /**
   * I18n namespace
   *
   * Locales type
   */
  namespace I18n {
    type RouteKey = import('@elegant-router/types').RouteKey;

    type LangType = 'en-US' | 'zh-CN';

    type LangOption = {
      label: string;
      key: LangType;
    };

    type I18nRouteKey = Exclude<RouteKey, 'root' | 'not-found'>;

    type FormMsg = {
      required: string;
      invalid: string;
    };

    type Schema = {
      system: {
        title: string;
        updateTitle: string;
        updateContent: string;
        updateConfirm: string;
        updateCancel: string;
      };
      common: {
        action: string;
        add: string;
        addSuccess: string;
        backToHome: string;
        batchDelete: string;
        cancel: string;
        close: string;
        check: string;
        selectAll: string;
        expandColumn: string;
        columnSetting: string;
        config: string;
        confirm: string;
        delete: string;
        deleteSuccess: string;
        confirmDelete: string;
        edit: string;
        warning: string;
        error: string;
        index: string;
        keywordSearch: string;
        logout: string;
        logoutConfirm: string;
        lookForward: string;
        modify: string;
        modifySuccess: string;
        noData: string;
        operate: string;
        pleaseCheckValue: string;
        refresh: string;
        reset: string;
        search: string;
        switch: string;
        tip: string;
        trigger: string;
        update: string;
        updateSuccess: string;
        saveSuccess: string;
        clear: string;
        view: string;
        export: string;
        import: string;
        filterReplayLoadFailed: string;
        filterReplayExpired: string;
        userCenter: string;
        download: string;
        downloadTemplate: string;
        importModal: {
          title: string;
          step1Title: string;
          step2Title: string;
          step3Title: string;
          reasonLabel: string;
          reasonPlaceholder: string;
          uploadHint: string;
          uploadDesc: string;
          downloadTemplate: string;
          previewTitle: string;
          previewNew: string;
          previewExists: string;
          previewConflict: string;
          previewOutOfScope: string;
          conflictRecordsTruncatedHint: string;
          outOfScopeRecordsTruncatedHint: string;
          onConflictLabel: string;
          onConflictSkip: string;
          onConflictOverwrite: string;
          onConflictFailFast: string;
          syncModeLabel: string;
          syncModeCreateOnly: string;
          syncModeUpdateProfile: string;
          syncModeFullSync: string;
          previewTokenLabel: string;
          confirmImport: string;
          cancelling: string;
          fullErrorListHint: string;
          downloadConflictRecords: string;
          downloadOutOfScopeRecords: string;
          downloadFailedRows: string;
          resultTitle: string;
          resultSuccess: string;
          resultSkipped: string;
          resultOverwritten: string;
          resultFailed: string;
          idempotentReplayHint: string;
          cancelImport: string;
          errorCode: {
            INVALID_MIME: string;
            FILE_TOO_LARGE: string;
            REASON_REQUIRED: string;
            DRY_RUN_FAILED: string;
            EXECUTE_FAILED: string;
            CANCEL_FAILED: string;
            TEMPLATE_FAILED: string;
            NO_BATCH_ID: string;
          };
        };
        importHistory: string;
        exportModal: {
          title: string;
          aiConfirmSummary: string;
          estimatedRowsLabel: string;
          reasonLabel: string;
          reasonPlaceholder: string;
          confirmExport: string;
          exporting: string;
          exportSuccess: string;
          exportFailed: string;
          asyncRequiredHint: string;
          filterAppliedHint: string;
          errorCode: {
            REASON_REQUIRED: string;
            ASYNC_REQUIRED: string;
            EXPORT_FAILED: string;
          };
        };
        importHistoryDrawer: {
          title: string;
          refresh: string;
          openDetail: string;
          cancelBatch: string;
          noBatches: string;
          filterStatusPlaceholder: string;
          detailDrawerTitle: string;
          logsTabTitle: string;
          summaryTabTitle: string;
          cancelReasonLabel: string;
          cancelReasonPlaceholder: string;
          batchIdLabel: string;
          previewTokenLabel: string;
          filenameLabel: string;
          operatorLabel: string;
          totalRowsLabel: string;
          createdAtLabel: string;
          finishedAtLabel: string;
          statusLabel: string;
          expiresAtLabel: string;
          summaryNewLabel: string;
          summaryExistsLabel: string;
          summaryConflictLabel: string;
          summaryOutOfScopeLabel: string;
          successCountLabel: string;
          skippedCountLabel: string;
          overwrittenCountLabel: string;
          failedCountLabel: string;
          logsEventLabel: string;
          logsFromLabel: string;
          logsToLabel: string;
          logsOperatorLabel: string;
          logsTimeLabel: string;
          logsDetailLabel: string;
          errorCode: {
            BATCH_NOT_CANCELLABLE: string;
            BATCH_NOT_FOUND: string;
            CANCEL_FAILED: string;
          };
        };
        yesOrNo: {
          yes: string;
          no: string;
        };
      };
      request: {
        logout: string;
        logoutMsg: string;
        logoutWithModal: string;
        logoutWithModalMsg: string;
        refreshToken: string;
        tokenExpired: string;
      };
      theme: {
        themeDrawerTitle: string;
        tabs: {
          appearance: string;
          layout: string;
          general: string;
          preset: string;
        };
        appearance: {
          themeSchema: { title: string } & Record<UnionKey.ThemeScheme, string>;
          grayscale: string;
          colourWeakness: string;
          themeColor: {
            title: string;
            followPrimary: string;
          } & Record<Theme.ThemeColorKey, string>;
          recommendColor: string;
          recommendColorDesc: string;
          themeRadius: {
            title: string;
          };
          preset: {
            title: string;
            apply: string;
            applySuccess: string;
            [key: string]:
              | {
                  name: string;
                  desc: string;
                }
              | string;
          };
        };
        layout: {
          layoutMode: { title: string } & Record<UnionKey.ThemeLayoutMode, string> & {
              [K in `${UnionKey.ThemeLayoutMode}_detail`]: string;
            };
          tab: {
            title: string;
            visible: string;
            cache: string;
            cacheTip: string;
            height: string;
            mode: { title: string } & Record<UnionKey.ThemeTabMode, string>;
            closeByMiddleClick: string;
            closeByMiddleClickTip: string;
          };
          header: {
            title: string;
            height: string;
            breadcrumb: {
              visible: string;
              showIcon: string;
            };
          };
          sider: {
            title: string;
            inverted: string;
            width: string;
            collapsedWidth: string;
            mixWidth: string;
            mixCollapsedWidth: string;
            mixChildMenuWidth: string;
            autoSelectFirstMenu: string;
            autoSelectFirstMenuTip: string;
          };
          footer: {
            title: string;
            visible: string;
            fixed: string;
            height: string;
            right: string;
          };
          content: {
            title: string;
            scrollMode: { title: string; tip: string } & Record<UnionKey.ThemeScrollMode, string>;
            page: {
              animate: string;
              mode: { title: string } & Record<UnionKey.ThemePageAnimateMode, string>;
            };
            fixedHeaderAndTab: string;
          };
        };
        general: {
          title: string;
          watermark: {
            title: string;
            visible: string;
            text: string;
            enableUserName: string;
            enableTime: string;
            timeFormat: string;
          };
          multilingual: {
            title: string;
            visible: string;
          };
          globalSearch: {
            title: string;
            visible: string;
          };
        };
        configOperation: {
          copyConfig: string;
          copySuccessMsg: string;
          resetConfig: string;
          resetSuccessMsg: string;
        };
      };
      route: Record<I18nRouteKey, string> & { [key: string]: string };
      page: {
        login: {
          common: {
            loginOrRegister: string;
            userNamePlaceholder: string;
            phonePlaceholder: string;
            codePlaceholder: string;
            passwordPlaceholder: string;
            confirmPasswordPlaceholder: string;
            codeLogin: string;
            confirm: string;
            back: string;
            validateSuccess: string;
            loginSuccess: string;
            welcomeBack: string;
          };
          pwdLogin: {
            title: string;
            rememberMe: string;
            forgetPassword: string;
            register: string;
            otherAccountLogin: string;
            otherLoginMode: string;
            superAdmin: string;
            admin: string;
            user: string;
          };
          codeLogin: {
            title: string;
            getCode: string;
            reGetCode: string;
            sendCodeSuccess: string;
            imageCodePlaceholder: string;
          };
          register: {
            title: string;
            agreement: string;
            protocol: string;
            policy: string;
          };
          resetPwd: {
            title: string;
          };
          bindWeChat: {
            title: string;
          };
        };
        profile: {
          title: string;
          baseInfo: string;
          newPassword: string;
          confirmPassword: string;
          passwordMinLength: string;
          oldPassword: string;
          oldPasswordPlaceholder: string;
          confirmPasswordPlaceholder: string;
          registerTime: string;
          confirmPwdMismatch: string;
          passwordChangeSuccess: string;
          changeAvatar: string;
          presetAvatar: string;
          uploadAvatar: string;
        };
        home: {
          branchDesc: string;
          greeting: string;
          weatherDesc: string;
          projectCount: string;
          todo: string;
          message: string;
          downloadCount: string;
          registerCount: string;
          schedule: string;
          study: string;
          work: string;
          rest: string;
          entertainment: string;
          visitCount: string;
          turnover: string;
          dealCount: string;
          creativity: string;
        };
        system: {
          common: {
            status: {
              enable: string;
              disable: string;
            };
          };
          dataScopeDemo: {
            title: string;
            subTitle: string;
            demoAccountHint: string;
            title_field: string;
            content: string;
            deptId: string;
            createBy: string;
            status: string;
            form: {
              title: string;
              content: string;
              status: string;
            };
            addData: string;
            editData: string;
          };
          role: {
            title: string;
            roleName: string;
            roleCode: string;
            roleStatus: string;
            roleDesc: string;
            dataScope: {
              label: string;
              placeholder: string;
              selectDept: string;
              all: string;
              custom: string;
              dept: string;
              deptAndSub: string;
              self: string;
            };
            form: {
              roleName: string;
              roleCode: string;
              roleStatus: string;
              roleDesc: string;
            };
            addRole: string;
            editRole: string;
            menuAuth: string;
            buttonAuth: string;
          };
          user: {
            title: string;
            userName: string;
            password: string;
            userGender: string;
            nickname: string;
            userPhone: string;
            userEmail: string;
            userStatus: string;
            userRole: string;
            userDept: string;
            primaryDept: string;
            form: {
              userName: string;
              password: string;
              userGender: string;
              nickname: string;
              userPhone: string;
              userEmail: string;
              userStatus: string;
              userRole: string;
              userRoleRequired: string;
              primaryDeptRequired: string;
            };
            addUser: string;
            editUser: string;
            defaultPasswordHint: string;
            gender: {
              unknown: string;
              male: string;
              female: string;
            };
            resetPwd: {
              title: string;
            };
          };
          menu: {
            home: string;
            title: string;
            id: string;
            parentId: string;
            menuType: string;
            parentMenu: string;
            menuName: string;
            routeName: string;
            routePath: string;
            pathParam: string;
            layout: string;
            page: string;
            i18nKey: string;
            icon: string;
            localIcon: string;
            iconTypeTitle: string;
            order: string;
            constant: string;
            keepAlive: string;
            href: string;
            hideInMenu: string;
            activeMenu: string;
            multiTab: string;
            fixedIndexInTab: string;
            query: string;
            button: string;
            buttonCode: string;
            buttonDesc: string;
            presetButton: {
              addAll: string;
              list: string;
              add: string;
              edit: string;
              delete: string;
              batchDelete: string;
              export: string;
              import: string;
            };
            menuStatus: string;
            form: {
              home: string;
              menuType: string;
              parentMenu: string;
              menuName: string;
              routeName: string;
              routePath: string;
              pathParam: string;
              layout: string;
              page: string;
              i18nKey: string;
              icon: string;
              localIcon: string;
              order: string;
              keepAlive: string;
              href: string;
              hideInMenu: string;
              activeMenu: string;
              multiTab: string;
              fixedInTab: string;
              fixedIndexInTab: string;
              queryKey: string;
              queryValue: string;
              button: string;
              buttonCode: string;
              buttonDesc: string;
              menuStatus: string;
            };
            addMenu: string;
            editMenu: string;
            addChildMenu: string;
            type: {
              directory: string;
              menu: string;
              button: string;
            };
            iconType: {
              iconify: string;
              local: string;
            };
            iconPicker: {
              title: string;
              search: string;
              empty: string;
            };
          };
          dict: {
            title: string;
            dictTypeName: string;
            dictTypeCode: string;
            dictType: string;
            status: string;
            remark: string;
            typeForm: {
              dictTypeName: string;
              dictTypeCode: string;
              status: string;
              remark: string;
            };
            addDictType: string;
            editDictType: string;
            viewDictData: string;
            dictDataTitle: string;
            dictLabel: string;
            dictValue: string;
            dictSort: string;
            cssClass: string;
            listClass: string;
            isDefault: string;
            dataForm: {
              dictType: string;
              dictLabel: string;
              dictValue: string;
              dictSort: string;
              cssClass: string;
              listClass: string;
              isDefault: string;
              status: string;
            };
            addDictData: string;
            editDictData: string;
            backToDictType: string;
            validation: {
              dictNameMinLength: string;
              dictTypeMinLength: string;
            };
          };
          dept: {
            title: string;
            deptName: string;
            parentId: string;
            orderNum: string;
            leader: string;
            phone: string;
            email: string;
            deptStatus: string;
            createTime: string;
            form: {
              parentId: string;
              deptName: string;
              orderNum: string;
              leader: string;
              phone: string;
              email: string;
              deptStatus: string;
            };
            addDept: string;
            addChildDept: string;
            editDept: string;
            manageUsers: string;
            manageUsersTip: string;
            candidateUsers: string;
            deptMembers: string;
            searchUser: string;
            searchMember: string;
            validation: {
              deptNameMinLength: string;
            };
          };
          file: {
            title: string;
            fileName: string;
            fileType: string;
            fileSize: string;
            uploader: string;
            uploadTime: string;
            copyLink: string;
            confirmDelete: string;
            linkCopied: string;
            uploadFile: string;
            fileList: string;
            fileNamePlaceholder: string;
            fileTypePlaceholder: string;
            uploadDraggerTip: string;
            uploadDraggerDesc: string;
          };
          job: {
            title: string;
            jobName: string;
            jobKey: string;
            cronExpression: string;
            triggerType: string;
            triggerTypeCron: string;
            triggerTypeInterval: string;
            interval: string;
            intervalValue: string;
            intervalUnit: string;
            unitSeconds: string;
            unitMinutes: string;
            unitHours: string;
            unitDays: string;
            presetEveryMinute: string;
            presetEveryHour: string;
            presetEveryDay: string;
            presetEveryWeek: string;
            presetEveryMonth: string;
            presetEveryYear: string;
            descEveryMinute: string;
            descEveryHour: string;
            descEveryDay: string;
            descEveryWeek: string;
            jobArgs: string;
            status: string;
            concurrent: string;
            remark: string;
            concurrentAllow: string;
            concurrentForbid: string;
            timeoutSeconds: string;
            maxRetries: string;
            nextRunTime: string;
            runOnEnable: string;
            form: {
              jobName: string;
              jobKey: string;
              cronExpression: string;
              jobArgs: string;
              status: string;
              concurrent: string;
              remark: string;
              intervalValue: string;
              intervalUnit: string;
              timeoutSeconds: string;
              maxRetries: string;
              runOnEnableHint: string;
            };
            addJob: string;
            editJob: string;
            runNow: string;
            enableJob: string;
            disableJob: string;
            runConfirm: string;
            enableConfirm: string;
            disableConfirm: string;
            validation: {
              cronInvalid: string;
            };
          };
          jobLog: {
            title: string;
            jobName: string;
            jobKey: string;
            status: string;
            errorMsg: string;
            startTime: string;
            endTime: string;
            duration: string;
            attemptCount: string;
            statusSuccess: string;
            statusFailed: string;
            statusRunning: string;
            clean: string;
            cleanConfirm: string;
            cleanSuccess: string;
            detailTitle: string;
          };
          operationLog: {
            title: string;
            module: string;
            moduleSystem: string;
            moduleAuth: string;
            moduleJob: string;
            moduleAi: string;
            action: string;
            actionCreate: string;
            actionUpdate: string;
            actionDelete: string;
            username: string;
            usernamePlaceholder: string;
            method: string;
            path: string;
            statusCode: string;
            duration: string;
            createTime: string;
            clean: string;
            cleanConfirm: string;
            cleanSuccess: string;
            detailTitle: string;
            requestParams: string;
            noParams: string;
          };
          loginLog: {
            title: string;
            username: string;
            usernamePlaceholder: string;
            ipPlaceholder: string;
            status: string;
            statusSuccess: string;
            statusFailed: string;
            statusLocked: string;
            userAgent: string;
            message: string;
            loginTime: string;
            clean: string;
            cleanConfirm: string;
            cleanSuccess: string;
          };
          config: {
            title: string;
            configName: string;
            configKey: string;
            configValue: string;
            configType: string;
            configGroup: string;
            configStatus: string;
            isPublic: string;
            remark: string;
            form: {
              configName: string;
              configKey: string;
              configValue: string;
              configType: string;
              configGroup: string;
              configStatus: string;
              isPublic: string;
              remark: string;
            };
            addConfig: string;
            editConfig: string;
            typeText: string;
            typeRichtext: string;
            typeFile: string;
          };
        };
        ai: {
          chat: {
            title: string;
            newChat: string;
            searchPlaceholder: string;
            noConversation: string;
            deleteTitle: string;
            deleteContent: string;
            welcomeTitle: string;
            welcomeDesc: string;
            inputPlaceholder: string;
            inputHint: string;
            thinking: string;
            noModel: string;
            availabilityLoading: string;
            availabilityForbidden: string;
            availabilityModuleDisabled: string;
            availabilityNoAgents: string;
            availabilityNoModels: string;
            availabilityModelUnavailable: string;
            availabilityError: string;
            resultProjectionForbidden: string;
            copy: string;
            copied: string;
            regenerate: string;
            editPlaceholder: string;
            editTip: string;
            attachFile: string;
            attachFileHint: string;
            fileUploadFailed: string;
            fileTypeUnsupported: string;
            removeFile: string;
            quickCode: string;
            quickTranslate: string;
            quickAnalyze: string;
            quickArticle: string;
            quickCodePrompt: string;
            quickTranslatePrompt: string;
            quickAnalyzePrompt: string;
            quickArticlePrompt: string;
            sceneDataTitle: string;
            sceneDataDesc: string;
            sceneDataPrompt: string;
            sceneUserTitle: string;
            sceneUserDesc: string;
            sceneUserPrompt: string;
            sceneFileTitle: string;
            sceneFileDesc: string;
            sceneFilePrompt: string;
            sceneJobTitle: string;
            sceneJobDesc: string;
            sceneJobPrompt: string;
            confirmTitle: string;
            confirmTool: string;
            confirmSummary: string;
            confirmImpact: string;
            confirmAffected: string;
            deptLookup: string;
            userId: string;
            targetUser: string;
            confirmCreateUserSummary: string;
            confirmResetPasswordSummary: string;
            confirmUpdateUserSingleSummary: string;
            confirmUpdateUserMultipleSummary: string;
            confirmBatchDeleteSummary: string;
            confirmUpdateCronSummary: string;
            destructiveWarning: string;
            clarificationQuotaExceeded: string;
            clarificationSelectionRequired: string;
            confirmArgs: string;
            confirmSecondsLeft: string;
            toolRunning: string;
            toolSuccess: string;
            toolFailed: string;
            toolDetails: string;
            toolArgs: string;
            toolResult: string;
            toolError: string;
            fileConversation: string;
            imageConversation: string;
            fileFallback: string;
            attachmentFallback: string;
            loadConversationFailed: string;
            aiError: string;
            unknownError: string;
            usageLimitExceeded: string;
            requestFailed: string;
            responseNotPersisted: string;
            sendFailed: string;
            responseSyncPending: string;
            resumeFailedAfterRetries: string;
            actionHandledLoadingResult: string;
            confirmationExpiredOrHandled: string;
            confirmationNearExpiry: string;
            confirmationExpired: string;
            resumeFailed: string;
            confirmationFailed: string;
            confirmationFailedWithMessage: string;
            operationCardSyncPending: string;
            operationSucceeded: string;
            operationCancelled: string;
            operationExpired: string;
            operationFailed: string;
            operationFailedWithCode: string;
            operationStillRunning: string;
            pendingActionFirst: string;
            previousResponseSyncPending: string;
            feedbackSubmitFailed: string;
            feedbackSubmitted: string;
            toolWaitingConfirmation: string;
            toolExecuted: string;
            toolExecutedRows: string;
            toolFailedWithReason: string;
            toolArgsMetadataHint: string;
            toolDataView: string;
            toolResultSummary: string;
            viewFullData: string;
            replayFilterHint: string;
            downloading: string;
            downloadFile: string;
            downloadFailed: string;
            timeRemaining: string;
            expiringSoon: string;
            autoCancelAfterFiveMinutes: string;
            confirmNow: string;
            statsUnknown: string;
            statsMale: string;
            statsFemale: string;
            statsTable: string;
            statsBar: string;
            statsPie: string;
            statsTotal: string;
            rowsAffected: string;
            viewIdList: string;
            toolErrors: {
              AI_TOOL_NOT_FOUND: string;
              AI_TOOL_PERM_DENIED: string;
              AI_DATA_SCOPE_VIOLATION: string;
              AI_RATE_LIMIT_USER_WRITE: string;
              AI_DAILY_QUOTA_EXHAUSTED: string;
              AI_TOOL_TIMEOUT: string;
              AI_REPEATED_FAILURE: string;
              AI_INTERNAL_ERROR: string;
              AI_HITL_EXPIRED: string;
              USER_REJECTED: string;
              AI_STATS_FIELD_NOT_ALLOWED: string;
            };
            toolDescriptions: {
              userLookup: string;
              userList: string;
              userUpdateDept: string;
              userUpdateEmail: string;
              userBatchDelete: string;
              userDisable: string;
              userEnable: string;
              userDistinct: string;
              userCount: string;
              userStats: string;
              roleCount: string;
              roleList: string;
              deptCount: string;
              deptList: string;
              deptExportMembers: string;
              roleBindMenus: string;
              fileParse: string;
              jobUpdateCron: string;
            };
            resumedAt: string;
            // Agent routing feedback
            agentAutoName: string;
            agentAutoDesc: string;
            routingFeedback: string;
            routingFeedbackTitle: string;
            feedbackCorrect: string;
            feedbackWrong: string;
            feedbackPickAgent: string;
          };
          provider: {
            title: string;
            name: string;
            code: string;
            apiKey: string;
            baseUrl: string;
            models: string;
            status: string;
            egressStatus: string;
            egressPolicyBlocked: string;
            egressPolicyAllowed: string;
            saveBeforeTest: string;
            addProvider: string;
            editProvider: string;
            capabilities: string;
            capText: string;
            capVision: string;
            capImageGen: string;
            capVideo: string;
            capAudio: string;
            capEmbedding: string;
            modelBaseUrl: string;
            sortOrder: string;
            form: {
              code: string;
              name: string;
              apiKey: string;
              apiKeyEdit: string;
              baseUrl: string;
              model: string;
              modelBaseUrl: string;
              modelName: string;
            };
            addModel: string;
            capabilitiesRequired: string;
            testConnectivity: string;
            testSuccess: string;
            testFailed: string;
            testNoModel: string;
            testNoCode: string;
            modelTestSuccess: string;
          };
          agent: {
            title: string;
            description: string;
            descriptionHint: string;
            systemPrompt: string;
            riskAppetite: string;
            riskAppetiteConservative: string;
            riskAppetiteBalanced: string;
            riskAppetiteAggressive: string;
            dailyQuotaPerUser: string;
            dailyQuotaHint: string;
            modelPreference: string;
            useGlobalDefault: string;
            code: string;
            name: string;
            enabled: string;
            isBuiltin: string;
            displayOrder: string;
            keyword: string;
            enabledFilter: string;
            all: string;
            enabledValue: string;
            disabled: string;
            yes: string;
            no: string;
            editTitle: string;
            loadFailed: string;
          };
          routingFeedback: {
            title: string;
            last7Days: string;
            last30Days: string;
            total: string;
            correct: string;
            wrong: string;
            wrongRate: string;
            topWrongAgents: string;
            detail: string;
            originalAgent: string;
            correctedAgent: string;
            agentFlow: string;
            traceId: string;
            time: string;
            user: string;
            filter: string;
            timeRange: string;
            overview: string;
            topWrongAgentsTop10: string;
            wrongCount: string;
            topCorrected: string;
            wrongDetail: string;
            originalAgentPlaceholder: string;
            correctedAgentPlaceholder: string;
          };
          aiAgentAuth: {
            title: string;
            sharedHint: string;
            sharedTag: string;
          };
        };
        marketplace: {
          browse: {
            searchPlaceholder: string;
            categoryAll: string;
            categoryBusiness: string;
            categoryTool: string;
            categoryAnalytics: string;
            categoryAiAgent: string;
            categoryAiSkill: string;
            categoryMcpAdapter: string;
            categoryIntegration: string;
            categoryTheme: string;
            sortDownload: string;
            sortLatest: string;
            sortRating: string;
            navUpload: string;
            navInstalled: string;
            empty: string;
            unknownAuthor: string;
            noDescription: string;
            downloadLabel: string;
            ratingLabel: string;
          };
          detail: {
            author: string;
            descTitle: string;
            downloadCount: string;
            avgRating: string;
            ratingCount: string;
            notFound: string;
            confirmUninstall: string;
            openApp: string;
          };
          installed: {
            title: string;
            colApp: string;
            colVersion: string;
            colStatus: string;
            colInstalledAt: string;
            colActions: string;
            detailHint: string;
            searchAppSlug: string;
            searchAppSlugPlaceholder: string;
            searchStatus: string;
            statusAll: string;
            statusEnabled: string;
            statusInstalled: string;
            statusDisabled: string;
            statusUninstalled: string;
          };
          upload: {
            title: string;
            dropzoneTitle: string;
            dropzoneDesc: string;
            manifestTitle: string;
            submit: string;
          };
          actions: {
            install: string;
            enable: string;
            disable: string;
            uninstall: string;
            open: string;
            back: string;
            detail: string;
          };
          status: {
            enabled: string;
            installed: string;
            disabled: string;
            uninstalled: string;
          };
          messages: {
            installSuccess: string;
            installFailed: string;
            enabled: string;
            disabled: string;
            uninstalled: string;
            selectPackage: string;
            fillManifest: string;
            invalidJson: string;
            uploadSuccess: string;
            uploadFailed: string;
          };
          lowcode: {
            invalidRoute: string;
            loadFailed: string;
            colActions: string;
            buttonEdit: string;
            buttonDelete: string;
            buttonCreate: string;
            confirmDelete: string;
            itemCount: string;
            titleEdit: string;
            titleCreate: string;
            buttonCancel: string;
            buttonSave: string;
            msgLoadFailed: string;
            msgSubmitFailed: string;
            msgCreateSuccess: string;
            msgUpdateSuccess: string;
            msgDeleteFailed: string;
            rangeMin: string;
            rangeMax: string;
            msgFieldRequired: string;
            msgValidationFailed: string;
          };
          review: {
            title: string;
            statusAll: string;
            statusPending: string;
            statusApproved: string;
            statusRejected: string;
            colApp: string;
            colVersion: string;
            colStatus: string;
            colRisk: string;
            colCreatedAt: string;
            colActions: string;
            btnDetail: string;
            btnApprove: string;
            btnReject: string;
            btnConfirmReject: string;
            rejectTitle: string;
            rejectPlaceholder: string;
            changelogTitle: string;
            manifestTitle: string;
            previousCommentTitle: string;
            notFound: string;
            msgApproveSuccess: string;
            msgRejectSuccess: string;
            msgInvalidId: string;
          };
        };
      };
      form: {
        required: string;
        userName: FormMsg;
        phone: FormMsg;
        pwd: FormMsg;
        confirmPwd: FormMsg;
        code: FormMsg;
        email: FormMsg;
      };
      dropdown: Record<Global.DropdownKey, string>;
      icon: {
        themeConfig: string;
        themeSchema: string;
        lang: string;
        fullscreen: string;
        fullscreenExit: string;
        reload: string;
        collapse: string;
        expand: string;
        pin: string;
        unpin: string;
      };
      datatable: {
        itemCount: string;
        fixed: {
          left: string;
          right: string;
          unFixed: string;
        };
      };
      errorCode: {
        UNAUTHORIZED: string;
        INVALID_CREDENTIALS: string;
        TOKEN_EXPIRED: string;
        ACCOUNT_DISABLED: string;
        UNSUPPORTED_LOGIN_TYPE: string;
        AI_PROVIDER_NOT_FOUND: string;
        AI_MODEL_NOT_FOUND: string;
        AI_CONVERSATION_NOT_FOUND: string;
        AI_MODEL_NOT_CONFIGURED: string;
        AI_USAGE_LIMIT_EXCEEDED: string;
        AI_CHAT_GUARD_LOST: string;
        AI_MESSAGE_PERSIST_FAILED: string;
        AI_ROUTING_FAILED: string;
        AI_IP_BLOCKED: string;
        AI_USER_AUTO_DISABLED: string;
        AI_KEYWORD_BLOCKED: string;
        AI_FORBIDDEN_TOPIC: string;
        AI_FORBIDDEN_URL: string;
        AI_PROVIDER_DUPLICATE: string;
        AI_TEST_NO_MODEL: string;
        AI_TEST_NO_API_KEY: string;
        AI_TEST_FAILED: string;
        INVALID_PASSWORD_FORMAT: string;
        INCORRECT_OLD_PASSWORD: string;
        MISSING_PERMISSION: string;
        SUPER_ADMIN_ONLY: string;
        AI_AGENT_NOT_FOUND: string;
        AI_AGENT_DESC_LENGTH_INVALID: string;
        AI_AGENT_MODEL_PREFERENCE_INVALID: string;
        AI_AGENT_QUOTA_INVALID: string;
        AI_AGENT_ID_INVALID: string;
        AI_ROLE_NOT_FOUND: string;
        AI_ROLE_AGENT_BIND_SHARED_FORBIDDEN: string;
        AI_IMPORT_FILE_TOO_LARGE: string;
        AI_IMPORT_INVALID_MIME: string;
        AI_IMPORT_TOO_MANY_ROWS: string;
        AI_IMPORT_USERNAME_INVALID: string;
        AI_IMPORT_EMAIL_INVALID: string;
        AI_IMPORT_PHONE_INVALID: string;
        AI_IMPORT_DEPT_NOT_FOUND: string;
        AI_IMPORT_EMPTY: string;
        AI_IMPORT_PREVIEW_INVALID: string;
        AI_IMPORT_BATCH_RUNNING: string;
        AI_IMPORT_ALREADY_EXECUTED: string;
        AI_IMPORT_BATCH_CANCELLED: string;
        AI_IMPORT_BATCH_EXPIRED: string;
        AI_IMPORT_ILLEGAL_TRANSITION: string;
        AI_IMPORT_FIELD_ERRORS: string;
        AI_IMPORT_REASON_TOO_LONG: string;
        AI_IMPORT_RECORDS_HASH_MISMATCH: string;
        AI_IMPORT_DEPT_PATH_NOT_FOUND: string;
        AI_IMPORT_DEPT_DUPLICATE: string;
        AI_IMPORT_ROLE_NOT_FOUND: string;
        AI_IMPORT_DEPT_OUT_OF_SCOPE: string;
        AI_IMPORT_ROLE_OUT_OF_SCOPE: string;
        AI_IMPORT_USERNAME_DUPLICATE: string;
        AI_IMPORT_EMPLOYEE_NO_EXISTS: string;
        AI_IMPORT_EMPLOYEE_NO_DUPLICATE: string;
        AI_IMPORT_BATCH_NOT_FOUND: string;
        AI_IMPORT_BATCH_NOT_CANCELLABLE: string;
        AI_IMPORT_DEFAULT_PASSWORD_NOT_SET: string;
        AI_IMPORT_DEFAULT_PASSWORD_INVALID: string;
        AI_USER_DEFAULT_PASSWORD_NOT_SET: string;
        AI_USER_DEFAULT_PASSWORD_INVALID: string;
        AI_USER_DEFAULT_ROLE_NOT_FOUND: string;
        AI_USER_DEPT_NAME_REQUIRED: string;
        AI_USER_PRIMARY_DEPT_NOT_FOUND: string;
        AI_USER_CREATE_INVALID: string;
        AI_LOOKUP_NO_MATCH: string;
        AI_USER_RESET_NOT_FOUND: string;
        AI_USER_RESET_SELF_FORBIDDEN: string;
        AI_IMPORT_REASON_REQUIRED: string;
        AI_EXPORT_ASYNC_REQUIRED: string;
        AI_EXPORT_TASK_NOT_FOUND: string;
      };
      // Tool result labels referenced by backend UIResult.label_key values
      ai: {
        tool: {
          field: {
            name: string;
            code: string;
            status: string;
            parentDeptId: string;
            userName: string;
            nickname: string;
            exportId: string;
            exportRows: string;
            fileSize: string;
            expiresAt: string;
            jobId: string;
            newCron: string;
          };
          user: {
            count: { result: string };
            stats: { result: string };
            distinct: { result: string };
            batch_delete: { result: string };
            create: { result: string };
            dept_lookup: { result: string };
            list: { result: string };
            lookup: { result: string };
            reset_password: { result: string };
            update: { result: string };
            import_preview: { result: string };
            import_execute: { result: string };
            export: { result: string };
          };
          role: {
            count: { result: string };
            list: { result: string };
          };
          dept: {
            count: { result: string };
            list: { result: string };
          };
          job: {
            update_cron: { result: string };
          };
          file: {
            parse: { result: string };
          };
        };
      };
    };

    type GetI18nKey<T extends Record<string, unknown>, K extends keyof T = keyof T> = K extends string
      ? T[K] extends Record<string, unknown>
        ? `${K}.${GetI18nKey<T[K]>}`
        : K
      : never;

    type I18nKey = GetI18nKey<Schema>;

    type TranslateOptions<Locales extends string> = import('vue-i18n').TranslateOptions<Locales>;

    interface $T {
      (key: I18nKey): string;
      (key: I18nKey, plural: number, options?: TranslateOptions<LangType>): string;
      (key: I18nKey, defaultMsg: string, options?: TranslateOptions<I18nKey>): string;
      (key: I18nKey, list: unknown[], options?: TranslateOptions<I18nKey>): string;
      (key: I18nKey, list: unknown[], plural: number): string;
      (key: I18nKey, list: unknown[], defaultMsg: string): string;
      (key: I18nKey, named: Record<string, unknown>, options?: TranslateOptions<LangType>): string;
      (key: I18nKey, named: Record<string, unknown>, plural: number): string;
      (key: I18nKey, named: Record<string, unknown>, defaultMsg: string): string;
    }
  }

  /** Service namespace */
  namespace Service {
    /** Other baseURL key */
    type OtherBaseURLKey = 'demo';

    interface ServiceConfigItem {
      /** The backend service base url */
      baseURL: string;
      /** The proxy pattern of the backend service base url */
      proxyPattern: string;
    }

    interface OtherServiceConfigItem extends ServiceConfigItem {
      key: OtherBaseURLKey;
    }

    /** The backend service config */
    interface ServiceConfig extends ServiceConfigItem {
      /** Other backend service config */
      other: OtherServiceConfigItem[];
    }

    interface SimpleServiceConfig extends Pick<ServiceConfigItem, 'baseURL'> {
      other: Record<OtherBaseURLKey, string>;
    }

    /** The backend service response data */
    type Response<T = unknown> = {
      /** The backend service response code */
      code: string;
      /** The backend service response message */
      msg: string;
      /** The backend service response data */
      data: T;
      /** Machine-readable error code for i18n mapping (optional, only in error responses) */
      errorCode?: string;
    };

    /** The demo backend service response data */
    type DemoResponse<T = unknown> = {
      /** The backend service response code */
      status: string;
      /** The backend service response message */
      message: string;
      /** The backend service response data */
      result: T;
    };
  }
}
