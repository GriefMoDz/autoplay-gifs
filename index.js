const { Plugin } = require('powercord/entities');
const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');
const { forceUpdateElement, getOwnerInstance, waitFor } = require('powercord/util');
const { inject, uninject } = require('powercord/injector');

const Settings = require('./components/Settings');
const types = [ 'AccountAvatar', 'ChatAvatars', 'MemberList', 'Home', 'GuildList' ];

class AutoplayGIFAvatars extends Plugin {
  async startPlugin () {
    this.UserStore = await getModule([ 'getCurrentUser' ]);
    this.ImageResolver = await getModule([ 'getUserAvatarURL', 'getGuildIconURL' ]);
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
    const { ImageResolver, UserStore } = this;

    const containerClasses = (await getModule([ 'container', 'usernameContainer' ]));
    const containerQuery = `.${containerClasses.container.replace(/ /g, '.')}:not(#powercord-spotify-modal)`;

    const instance = getOwnerInstance(await waitFor(containerQuery));
    inject('autoplayGifAvatars-accountAvatar', instance.__proto__, 'render', function (_, res) {
      if (_this.settings.get('account', true)) {
        const avatarChildren = (!res[1] ? res : res[1]).props.children[0].props.children.props.children();
        const avatar = avatarChildren.props.children.props.children;

        const userId = this.props.currentUser.id;
        const hasAnimatedAvatar = ImageResolver.hasAnimatedAvatar(UserStore.getUser(userId));
        if (!hasAnimatedAvatar) {
          return res;
        }

        avatar.props.src = ImageResolver.getUserAvatarURL(UserStore.getUser(userId), 'gif');
      }

      return res;
    });

    instance.forceUpdate();
  }

  async patchChatAvatars () {
    const messageClasses = await getModule([ 'container', 'messageCompact' ]);
    const MessageGroup = await getModuleByDisplayName('MessageGroup');
    inject('autoplayGifAvatars-chatAvatars', MessageGroup.prototype, 'render', (_, res) => {
      if (this.settings.get('chat', true) && res.props && res.props.children) {
        res.props.children[0][0].props.disableAvatarAnimation = false;
      }

      return res;
    });

    forceUpdateElement(`.${messageClasses.container.split(' ')[0]}`, true);
  }

  async patchHome () {
    const { ImageResolver, UserStore } = this;

    const Friends = await getModuleByDisplayName('FluxContainer(Friends)');
    inject('autoplayGifAvatars-home', Friends.prototype, 'render', (_, res) => {
      for (const row of res.props.rows._rows) {
        if (this.settings.get('home', true) && row.user) {
          const userId = row.key;
          const hasAnimatedAvatar = ImageResolver.hasAnimatedAvatar(UserStore.getUser(userId));
          if (!hasAnimatedAvatar) {
            return res;
          }

          row.user.getAvatarURL = () => ImageResolver.getUserAvatarURL(UserStore.getUser(userId), 'gif');
        }
      }

      return res;
    });
  }

  async patchMemberList () {
    const _this = this;
    const { ImageResolver, UserStore } = this;

    const membersClasses = await getModule([ 'member', 'icon' ]);
    const MemberListItem = await getModuleByDisplayName('MemberListItem');
    inject('autoplayGifAvatars-memberList', MemberListItem.prototype, 'render', function (_, res) {
      if (this.props.user) {
        if (_this.settings.get('memberList-statuses', true)) {
          if (res.props.subText) {
            res.props.subText.props.animate = true;
          }
        }

        if (_this.settings.get('memberList-avatars', true)) {
          const userId = this.props.user.id;
          const hasAnimatedAvatar = ImageResolver.hasAnimatedAvatar(UserStore.getUser(userId));
          if (!hasAnimatedAvatar) {
            return res;
          }

          res.props.avatar.props.src = ImageResolver.getUserAvatarURL(UserStore.getUser(userId), 'gif');
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
      if (!this.props.animatable) {
        return res;
      }

      if (_this.settings.get('guildList', true)) {
        res.props.children
          .props.children[1].props.children
          .props.children.props.children.props.icon = this.props.guild.getIconURL('gif');
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
}

// eslint-disable-next-line no-extend-native
String.prototype.toCamelCase = function () {
  const str = this.valueOf();
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (match, index) =>
    index === 0 ? match.toLowerCase() : match.toUpperCase()
  ).replace(/\s+/g, '');
};

module.exports = AutoplayGIFAvatars;
