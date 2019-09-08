const { Plugin } = require('powercord/entities');
const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');
const { forceUpdateElement, getOwnerInstance } = require('powercord/util');
const { inject, uninject } = require('powercord/injector');

const Settings = require('./components/Settings');
const types = [ 'ChatAvatars', 'MemberListAvatars', 'GuildList' ];

class AutoplayGIFAvatars extends Plugin {
  async startPlugin () {
    this.listItemClasses = (await getModule([ 'guildSeparator', 'listItem' ]));

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
      uninject(`autoplayGifAvatars-${this.toCamelCase(type)}`);
    }
  }

  async patchChatAvatars () {
    const messageClasses = (await getModule([ 'container', 'messageCompact' ]));
    const MessageGroup = (await getModuleByDisplayName('MessageGroup'));
    inject('autoplayGifAvatars-chatAvatars', MessageGroup.prototype, 'render', (_, res) => {
      if (this.settings.get('chat', true) && res.props && res.props.children) {
        res.props.children[0][0].props.disableAvatarAnimation = false;
      }

      return res;
    });

    forceUpdateElement(`.${messageClasses.container.replace(/ /g, '.')}`, true);
  }

  async patchMemberListAvatars () {
    const _this = this;

    const UserStore = (await getModule([ 'getCurrentUser' ]));
    const ImageResolver = (await getModule([ 'getUserAvatarURL', 'getGuildIconURL' ]));

    const membersClasses = (await getModule([ 'member', 'icon' ]));
    const MemberList = (await getModuleByDisplayName('MemberListItem'));
    inject('autoplayGifAvatars-memberListAvatars', MemberList.prototype, 'render', function (_, res) {
      if (_this.settings.get('memberList', true) && this.props.user) {
        const userId = this.props.user.id;
        const hasAnimatedAvatar = ImageResolver.hasAnimatedAvatar(UserStore.getUser(userId));
        if (!hasAnimatedAvatar) {
          return res;
        }

        res.props.avatar.props.src = ImageResolver.getUserAvatarURL(UserStore.getUser(userId), 'gif');
      }

      return res;
    });

    forceUpdateElement(`.${membersClasses.member.replace(/ /g, '.')}`, true);
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

    forceUpdateElement(`.${this.listItemClasses.listItem.replace(/ /g, '.')}`, true);
  }

  async getGuildInstance () {
    const listItemQuery = `.${this.listItemClasses.listItem.replace(/ /g, '.')}`;

    for (const elem of document.querySelectorAll(listItemQuery)) {
      const instance = getOwnerInstance(elem);
      if (instance._reactInternalFiber.type.displayName === 'Guild') {
        return instance;
      }
    }
  }

  reload (args) {
    for (const type of types) {
      if (args === this.toCamelCase(type)) {
        uninject(`autoplayGifAvatars-${args}`);
        this[`patch${type}`]();
      }
    }
  }

  toCamelCase (str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (match, index) =>
      index === 0 ? match.toLowerCase() : match.toUpperCase()
    ).replace(/\s+/g, '');
  }
}

module.exports = AutoplayGIFAvatars;
