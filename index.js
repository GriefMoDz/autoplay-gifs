const { Plugin } = require('powercord/entities');
const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');
const { findInTree, findInReactTree, forceUpdateElement, getOwnerInstance, waitFor } = require('powercord/util');
const { inject, uninject } = require('powercord/injector');

const Settings = require('./components/Settings');

module.exports = class AutoplayGIFs extends Plugin {
  constructor () {
    super();

    this.patches = Object.freeze({
      GuildList: 'guild-icons',
      ChatAvatars: 'chat-avatars',
      ActivityStatus: 'activity-statuses',
      MemberListAvatars: 'member-list-avatars'
    });
  }

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

    Object.keys(this.patches).forEach(patchName => this[`patch${patchName}`]());
  }

  pluginWillUnload () {
    Object.keys(this.patches).forEach(patchName => uninject(`apg-${this.patches[patchName]}`));

    powercord.api.settings.unregisterSettings('autoplay-gifs');
  }

  async patchGuildList () {
    const _this = this;

    const { blobContainer } = await getModule([ 'blobContainer' ]);

    const instance = getOwnerInstance(await waitFor(`.${blobContainer}`));
    const reactInstance = instance?._reactInternalFiber || instance._reactInternals;

    const Guild = findInTree(reactInstance, n => n.type?.displayName === 'Guild', { walkable: [ 'return' ] }).type;
    inject('apg-guild-icons', Guild.prototype, 'render', function (_, res) {
      if (!this.props.animatable) {
        return res;
      }

      const GuildNavItem = findInReactTree(res, n => n.icon);
      if (_this.settings.get('guildIcons', true) && GuildNavItem?.icon) {
        GuildNavItem.icon = this.props.guild.getIconURL('gif');
      }

      return res;
    });

    forceUpdateElement(`.${this.listItemClasses.listItem}`, true);
  }

  async patchChatAvatars () {
    const MessageHeader = await getModule(m => {
      const defaultMethod = m.__powercordOriginal_default ?? m.default;
      return (typeof defaultMethod === 'function' ? defaultMethod : null)?.toString().includes('showTimestampOnHover');
    });

    inject('apg-chat-avatars', MessageHeader, 'default', ([ props ], res) => {
      if (this.settings.get('chatAvatars', true)) {
        const AvatarWithPopout = findInReactTree(res, n => n.type?.displayName === 'Popout');
        if (AvatarWithPopout) {
          AvatarWithPopout.props.children = (oldMethod => (args) => {
            let res = oldMethod(args);
            if (res.type !== 'img' || !props.message) {
              return res;
            }

            const avatar = this.getUserAvatar(props.message?.author?.id);
            if (avatar?.animated) {
              res.props.src = avatar.url;
            }

            return res;
          })(AvatarWithPopout.props.children);
        }
      }

      return res;
    });
  }

  async patchMemberListAvatars () {
    const MemberListItem = await getModuleByDisplayName('MemberListItem');
    inject('apg-member-list-avatars', MemberListItem.prototype, 'renderAvatar', ([ props ], res) => {
      if (this.settings.get('memberAvatars', true) && res.props?.src && props.id) {
        const avatar = this.getUserAvatar(props.id);
        if (avatar?.animated) {
          res.props.src = avatar.url;
        }
      }

      return res;
    });
  }

  async patchActivityStatus () {
    const ActivityStatus = await getModule(m => m.ActivityEmoji);
    inject('apg-activity-statuses', ActivityStatus, 'default', (args) => {
      if (this.settings.get('activityStatuses', true) && args[0]) {
        args[0].animate = true;
      }

      return args;
    }, true);
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
    } catch (_) {}
  }

  reloadPatch (patchName) {
    const injectionId = this.patches[patchName];
    uninject(`autoplayGifs-${injectionId}`);
    this[`patch${patchName}`]();
  }
};
