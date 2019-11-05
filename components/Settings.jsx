const { React } = require('powercord/webpack');
const { FormTitle } = require('powercord/components');
const { SwitchItem } = require('powercord/components/settings');

module.exports = class Settings extends React.Component {
  constructor (props) {
    super(props);

    this.main = props.main;
  }

  render () {
    return (
      <div>
        <FormTitle>Account</FormTitle>
        <SwitchItem
          note='If available, should your animated avatar autoplay in the account details container?'
          value={this.props.getSetting('account', true)}
          onChange={() => ((this.main.reload('accountAvatars'), this.props.toggleSetting('account')))}
        >
          Autoplay Avatar
        </SwitchItem>
        <FormTitle>Chat</FormTitle>
        <SwitchItem
          note='Should animated avatars for Nitro users autoplay in the chat area?'
          value={this.props.getSetting('chat', true)}
          onChange={() => ((this.main.reload('chatAvatars'), this.props.toggleSetting('chat')))}
        >
          Autoplay Avatars
        </SwitchItem>
        <FormTitle>Home</FormTitle>
        <SwitchItem
          note='Should animated avatars for Nitro users autoplay in the home/direct messages page?'
          value={this.props.getSetting('home', true)}
          onChange={() => ((this.main.reload('home'), this.props.toggleSetting('home')))}
        >
          Autoplay Avatars
        </SwitchItem>
        <FormTitle>Member List (<b style={{ color: '#43b581' }}>Note</b>: If any of the appearances below don't show/hide on first try, switch channels.)</FormTitle>
        <SwitchItem
          note='Should animated avatars for Nitro users autoplay in the member list?'
          value={this.props.getSetting('memberList-avatars', true)}
          onChange={() => ((this.main.reload('memberList'), this.props.toggleSetting('memberList-avatars')))}
        >
          Autoplay Avatars
        </SwitchItem>
        <SwitchItem
          note='Should animated emojis on custom statuses autoplay in the member list?'
          value={this.props.getSetting('memberList-statuses', true)}
          onChange={() => ((this.main.reload('memberList'), this.props.toggleSetting('memberList-statuses')))}
        >
          Autoplay Statuses
        </SwitchItem>
        <FormTitle>Guild List</FormTitle>
        <SwitchItem
          note='Should animated guild icons for boosted servers autoplay in the guild list?'
          value={this.props.getSetting('guildList', true)}
          onChange={() => ((this.main.reload('guildList'), this.props.toggleSetting('guildList')))}
        >
          Autoplay Icons
        </SwitchItem>
      </div>
    );
  }
};
