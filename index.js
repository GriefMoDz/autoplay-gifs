const { Plugin } = require('powercord/entities');
const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');
const { forceUpdateElement, findInReactTree } = require('powercord/util');
const { inject, uninject } = require('powercord/injector');

const Settings = require('./components/Settings');

module.exports = class AutoplayGIFs extends Plugin {
  async startPlugin () {
    this.userStore = await getModule([ 'getCurrentUser' ]);
    this.imageResolver = await getModule([ 'getUserAvatarURL', 'getGuildIconURL' ]);
    this.listItemClasses = await getModule([ 'guildSeparator', 'listItem' ]);

    powercord.api.settings.registerSettings('autoplay-gifs', {
      category: this.entityID,
      label: 'Autoplay GIFs',
      render: props => React.createElement(Settings, {
        ...props,
        main: this
      })
    });

    this.patches = Object.freeze({
      GuildList: 'guild-icons',
      ChatAvatars: 'chat-avatars',
      ActivityStatus: 'activity-statuses',
      MemberListAvatars: 'member-list-avatars'
    });

    for (const patchName in this.patches) {
      this[`patch${patchName}`]();
    }
  }

  pluginWillUnload () {
    for (const patchName in this.patches) {
      uninject(`autoplayGifs-${this.patches[patchName]}`);
    }

    powercord.api.settings.unregisterSettings('autoplay-gifs');
  }

  async patchGuildList () {
    const _this = this;
    const Guild = await this.getGuildComponent();
    inject('autoplayGifs-guild-icons', Guild.prototype, 'render', function (_, res) {
      if (!this.props.animatable) {
        return res;
      }

      const GuildNavItem = findInReactTree(res, n => n.icon);
      if (_this.settings.get('guildIcons', true) && GuildNavItem) {
        GuildNavItem.icon = this.props.guild.getIconURL('gif');
      }

      return res;
    });

    setImmediate(() => forceUpdateElement(`.${this.listItemClasses.listItem}`, !0));
  }

  async patchChatAvatars () {
    const MessageHeader = await getModule(m => m.MessageTimestamp);
    inject('autoplayGifs-chat-avatars', MessageHeader, 'default', (_, res) => {
      const UserPopout = res.props.children[0];
      if (!UserPopout || !UserPopout.props || !UserPopout.props.renderPopout) {
        return res;
      }

      const renderAvatar = UserPopout.props.children;
      if (!renderAvatar || typeof renderAvatar !== 'function' || renderAvatar.__patchedAPG) {
        return res;
      }

      if (this.settings.get('chatAvatars', true)) {
        UserPopout.props.children = () => {
          const res = renderAvatar();
          const userId = res.props.src.endsWith('powercord.png') ? null : res.props.src.split('/')[4];

          const avatar = this.getUserAvatar(userId);
          if (avatar && avatar.animated) {
            res.props.src = avatar.url;
          }

          return res;
        };

        UserPopout.props.children.__patchedAPG = !0;
      }

      return res;
    });
  }

  async patchMemberListAvatars () {
    const _this = this;
    const MemberListItem = await getModuleByDisplayName('MemberListItem');
    inject('autoplayGifs-member-list-avatars', MemberListItem.prototype, 'renderAvatar', function (args, res) {
      if (_this.settings.get('memberAvatars', true) && res.props.src) {
        const avatar = _this.getUserAvatar(this.props.user.id);
        if (avatar && avatar.animated) {
          res.props.src = avatar.url;
        }
      }

      return res;
    });
  }

  async patchActivityStatus () {
    const ActivityStatus = await getModule(m => m.ActivityEmoji);
    inject('autoplayGifs-activity-statuses', ActivityStatus, 'default', (args) => {
      if (this.settings.get('activityStatuses', true) && args[0]) {
        args[0].animate = !0;
      }

      return args;
    }, !0);
  }

  getUserAvatar (userId) {
    const { imageResolver, userStore } = this;

    try {
      const user = userStore.getUser(userId);
      const animated = imageResolver.hasAnimatedAvatar(user);

      return {
        animated,
        url: imageResolver.getUserAvatarURL(user, animated ? 'gif' : 'png')
      };
    } catch (e) {
      this.error(`Unable to get user avatar as "${userId}" isn't a valid user ID :(`);
    }
  }

  async getGuildComponent () {
    const DragSourceConnectedGuild = await getModule([ 'LurkingGuild' ]);
    const { DecoratedComponent } = DragSourceConnectedGuild.default;

    const owo = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current;
    const ogUseState = owo.useState;
    const ogUseLayoutEffect = owo.useLayoutEffect;
    const ogUseContext = owo.useContext;
    const ogUseRef = owo.useRef;

    owo.useState = () => [ null, () => void 0 ];
    owo.useLayoutEffect = () => null;
    owo.useRef = () => ({});
    owo.useContext = () => ({});

    const res = new DecoratedComponent({ guildId: null });

    owo.useState = ogUseState;
    owo.useLayoutEffect = ogUseLayoutEffect;
    owo.useContext = ogUseContext;
    owo.useRef = ogUseRef;

    return res.type;
  }

  reloadPatch (patchName) {
    const injectionId = this.patches[patchName];
    uninject(`autoplayGifs-${injectionId}`);
    this[`patch${patchName}`]();
  }
};
