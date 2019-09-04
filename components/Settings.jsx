const { React } = require('powercord/webpack');
const { SwitchItem } = require('powercord/components/settings');

module.exports = class Settings extends React.Component {
  constructor (props) {
    super(props);

    this.main = props.main;
  }

  render () {
    return (
      <div>
        <SwitchItem
          note='Should animated avatars for Nitro users autoplay in the chat area?'
          value={this.props.getSetting('chat', true)}
          onChange={() => ((this.main.reload('chatAvatars'), this.props.toggleSetting('chat')))}
        >
          Autoplay Chat
        </SwitchItem>
        <SwitchItem
          note='Should animated avatars for Nitro users autoplay in the member list?'
          value={this.props.getSetting('memberList', true)}
          onChange={() => ((this.main.reload('memberListAvatars'), this.props.toggleSetting('memberList')))}
        >
          Autoplay Member List
        </SwitchItem>
        <SwitchItem
          note='Should animated guild icons for boosted servers autoplay in the guild list?'
          value={this.props.getSetting('guildList', true)}
          onChange={() => ((this.main.reload('guildList'), this.props.toggleSetting('guildList')))}
        >
          Autoplay Guild List
        </SwitchItem>
      </div>
    );
  }
};
