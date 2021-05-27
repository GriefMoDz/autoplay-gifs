const { React, getModule } = require('powercord/webpack');
const { AsyncComponent, FormTitle } = require('powercord/components');
const { SwitchItem } = require('powercord/components/settings');

const HelpMessageModule = getModule([ 'HelpMessageTypes' ], false);
const HelpMessage = AsyncComponent.from(HelpMessageModule.default);
HelpMessage.Types = HelpMessageModule.HelpMessageTypes;

module.exports = class Settings extends React.Component {
  constructor (props) {
    super(props);

    this.main = props.main;
  }

  render () {
    return (
      <div>
        <HelpMessage messageType={HelpMessage.Types.WARNING}>
          Note: If any of the settings below don't trigger on first try, switch channels.
        </HelpMessage>
        <FormTitle style={{ marginTop: 10 }}>Chat</FormTitle>
        <SwitchItem
          note='Should animated avatars for Nitro users autoplay in the chat area?'
          value={this.props.getSetting('chatAvatars', true)}
          onChange={() => ((this.main.reloadPatch('ChatAvatars'), this.props.toggleSetting('chatAvatars')))}
        >
          User Avatars
        </SwitchItem>
        <FormTitle>Members List</FormTitle>
        <SwitchItem
          note='Should animated avatars for Nitro users autoplay in the members list?'
          value={this.props.getSetting('memberAvatars', true)}
          onChange={() => ((this.main.reloadPatch('MemberListAvatars'), this.props.toggleSetting('memberAvatars')))}
        >
          User Avatars
        </SwitchItem>
        <SwitchItem
          note='Should animated emojis on custom statuses autoplay in the members list?'
          value={this.props.getSetting('activityStatuses', true)}
          onChange={() => ((this.main.reloadPatch('ActivityStatus'), this.props.toggleSetting('activityStatuses')))}
        >
          Activity Statuses
        </SwitchItem>
        <FormTitle>Guild List</FormTitle>
        <SwitchItem
          note='Should animated guild icons for boosted and partnered servers autoplay in the guild list?'
          value={this.props.getSetting('guildIcons', true)}
          onChange={() => ((this.main.reloadPatch('GuildList'), this.props.toggleSetting('guildIcons')))}
        >
          Guild Icons
        </SwitchItem>
      </div>
    );
  }
};
