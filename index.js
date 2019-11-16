const { Plugin } = require('powercord/entities');
const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');
const { findInTree, forceUpdateElement, getOwnerInstance, waitFor } = require('powercord/util');
const { inject, uninject } = require('powercord/injector');

const Settings = require('./components/Settings');
const types = [ 'AccountAvatar', 'ChatAvatars', 'MemberList', 'Home', 'GuildList' ];

class AutoplayGIFAvatars extends Plugin {
  async startPlugin () {
    this.userStore = await getModule([ 'getCurrentUser' ]);
    this.imageResolver = await getModule([ 'getUserAvatarURL', 'getGuildIconURL' ]);
    this.listItemClasses = await getModule([ 'guildSeparator', 'listItem' ]);

    for (const type of types) {
      this[`patch${type}`]();
    }

    this.registerSettings('autoplayGifAvatars', 'Autoplay GIF Avatars', props => React.createElement(Settings, {
      ...props,
      main: this
    }));
  }

  pluginWillUnload () {
    for (const type of types) {
      uninject(`autoplayGifAvatars-${type.toCamelCase()}`);
    }
  }

  async patchAccountAvatar () {
    const _this = this;

    const containerClasses = await getModule([ 'container', 'usernameContainer' ]);
    const containerQuery = `.${containerClasses.container.split(' ')[0]}:not(#powercord-spotify-modal)`;
    const instance = getOwnerInstance(await waitFor(containerQuery));

    inject('autoplayGifAvatars-accountAvatar', instance.__proto__, 'render', function (_, res) {
      if (_this.settings.get('account', true)) {
        const avatarChildren = findInTree(res, n => n && n.renderPopout, { walkable: [ 'props', 'children' ] }).children();
        const avatar = findInTree(avatarChildren, n => n && n.src, { walkable: [ 'props', 'children' ] });
        const userId = this.props.currentUser.id;

        if (_this.isAvatarAnimated(userId)) {
          avatar.src = _this.getAnimatedAvatar(userId);
        }
      }

      return res;
    });

    instance.forceUpdate();
  }

  async patchChatAvatars () {
    const messageClasses = await getModule([ 'container', 'messageCompact' ]);
    const MessageGroup = await getModuleByDisplayName('MessageGroup');

    inject('autoplayGifAvatars-chatAvatars', MessageGroup.prototype, 'render', (_, res) => {
      if (this.settings.get('chat', true)) {
        const messages = findInTree(res, n => Array.isArray(n) && n[0] && n[0].key);

        for (const message of messages) {
          message.props.disableAvatarAnimation = false;
        }
      }

      return res;
    });

    forceUpdateElement(`.${messageClasses.container.split(' ')[0]}`, true);
  }

  async patchHome () {
    const _this = this;

    const channelClasses = await getModule([ 'channel', 'activityText' ]);
    const PrivateChannel = await getModuleByDisplayName('PrivateChannel');

    inject('autoplayGifAvatars-home', PrivateChannel.prototype, 'render', function (_, res) {
      const { avatar, subText } = res.props;

      if (this.props.user) {
        const userId = this.props.user.id;

        subText.props.animate = true;

        if (_this.settings.get('home', true) && _this.isAvatarAnimated(userId)) {
          avatar.props.src = _this.getAnimatedAvatar(userId);
        }
      }

      return res;
    });

    forceUpdateElement(`.${channelClasses.channel.split(' ')[0]}`, true);
  }

  async patchMemberList () {
    const _this = this;

    const membersClasses = await getModule([ 'member', 'icon' ]);
    const MemberListItem = await getModuleByDisplayName('MemberListItem');

    inject('autoplayGifAvatars-memberList', MemberListItem.prototype, 'render', function (_, res) {
      if (!this.props.user) {
        return res;
      }

      if (_this.settings.get('memberList-statuses', true) && res.props.subText) {
        res.props.subText.props.animate = true;
      }

      if (_this.settings.get('memberList-avatars', true)) {
        const avatar = findInTree(res, n => n && n.src);
        const userId = this.props.user.id;

        if (_this.isAvatarAnimated(userId)) {
          avatar.src = _this.getAnimatedAvatar(userId);
        }
      }

      return res;
    });

    forceUpdateElement(`.${membersClasses.member.split(' ')[0]}`, true);
  }

  async patchGuildList () {
    const _this = this;

    let instance = await this.getGuildInstance();
    while (typeof instance === 'undefined') {
      await new Promise(resolve => setTimeout(resolve, 100));

      instance = await this.getGuildInstance();
    }

    inject('autoplayGifAvatars-guildList', instance.__proto__, 'render', function (_, res) {
      if (_this.settings.get('guildList', true) && this.props.animatable) {
        const guild = findInTree(res, n => n && n.icon, { walkable: [ 'props', 'children' ] });
        guild.icon = this.props.guild.getIconURL('gif');
      }

      return res;
    });

    forceUpdateElement(`.${this.listItemClasses.listItem.split(' ')[0]}`, true);
  }

  async getGuildInstance () {
    const listItemQuery = `.${this.listItemClasses.listItem.split(' ')[0]}`;

    for (const elem of document.querySelectorAll(listItemQuery)) {
      const instance = getOwnerInstance(elem);
      if (instance._reactInternalFiber.type.displayName === 'Guild') {
        return instance;
      }
    }
  }

  reload (args) {
    for (const type of types) {
      if (args === type.toCamelCase()) {
        uninject(`autoplayGifAvatars-${args}`);
        this[`patch${type}`]();
      }
    }
  }

  isAvatarAnimated (userId) {
    return this.imageResolver.hasAnimatedAvatar(this.userStore.getUser(userId));
  }

  getAnimatedAvatar (userId) {
    return this.imageResolver.getUserAvatarURL(this.userStore.getUser(userId), 'gif');
  }
}

// eslint-disable-next-line no-extend-native
String.prototype.toCamelCase = function () {
  const str = this.valueOf();
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (match, index) =>
    index === 0 ? match.toLowerCase() : match.toUpperCase()
  ).replace(/\s+/g, '');
};

module.exports = AutoplayGIFAvatars;
