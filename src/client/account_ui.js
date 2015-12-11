// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT
/* eslint no-bitwise:off */
const assert = require('assert');
const local_storage = require('./glov/local_storage.js');
const glov_font = require('./glov/font.js');
const { KEYS, keyDownEdge } = require('./glov/input.js');
const { linkText } = require('./glov/link.js');
const net = require('./glov/net.js');
const ui = require('./glov/ui.js');
const { vec4 } = require('./glov/vmath.js');

export let style_link = glov_font.style(null, {
  color: 0x5040FFff,
  outline_width: 1.0,
  outline_color: 0x00000020,
});
export let style_link_hover = glov_font.style(null, {
  color: 0x0000FFff,
  outline_width: 1.0,
  outline_color: 0x00000020,
});

export function formatUserID(user_id, display_name) {
  let name = display_name || user_id;
  if (user_id.toLowerCase() !== name.toLowerCase()) {
    name = `${display_name} (${user_id})`;
  }
  return name;
}

function AccountUI() {
  this.edit_box_name = ui.createEditBox({
    placeholder: 'Username',
    initial_focus: true,
    text: local_storage.get('name') || '',
  });
  this.edit_box_password = ui.createEditBox({
    placeholder: 'Password',
    type: 'password',
    text: local_storage.get('name') && local_storage.get('password') || '',
  });
  this.edit_box_password_confirm = ui.createEditBox({
    initial_focus: true,
    placeholder: 'Confirm',
    type: 'password',
    text: '',
  });
  this.edit_box_email = ui.createEditBox({
    placeholder: 'Email',
    text: '',
  });
  this.edit_box_display_name = ui.createEditBox({
    placeholder: 'Display',
    text: '',
  });
  this.creation_mode = false;
}

AccountUI.prototype.showLogin = function (param) {
  let { x, y, style, button_height, button_width, prelogout, center, url_tos, url_priv, text_w, font_height } = param;
  font_height = font_height || ui.font_height;
  button_height = button_height || ui.button_height;
  button_width = button_width || 240;
  text_w = text_w || 400;
  let { edit_box_name, edit_box_password, edit_box_password_confirm, edit_box_email, edit_box_display_name } = this;
  let login_message;
  const BOX_H = font_height;
  let pad = 10;
  let min_h = BOX_H * 2 + pad * 3 + button_height;
  let calign = center ? glov_font.ALIGN.HRIGHT : glov_font.ALIGN.HLEFT | glov_font.ALIGN.HFIT;

  function showTOS(is_create) {
    if (url_tos) {
      assert(url_priv);
      let terms_height = font_height * 0.75;
      ui.font.drawSizedAligned(style, x, y, Z.UI, terms_height, glov_font.ALIGN.HCENTER, 0, 0,
        `By ${is_create ? 'creating an account' : 'logging in'} you agree to our`);
      y += terms_height;
      let and_w = ui.font.getStringWidth(style, terms_height, ' and ');
      ui.font.drawSizedAligned(style, x, y, Z.UI, terms_height, glov_font.ALIGN.HCENTER, 0, 0,
        'and');
      linkText({
        style_link, style_link_hover,
        x: x - and_w / 2 - ui.font.getStringWidth(style_link, terms_height, 'Terms of Service'),
        y,
        z: Z.UI,
        font_size: terms_height,
        url: url_tos,
        text: 'Terms of Service',
      });
      linkText({
        style_link, style_link_hover,
        x: x + and_w / 2,
        y,
        z: Z.UI,
        font_size: terms_height,
        url: url_priv,
        text: 'Privacy Policy',
      });
    }
    y += BOX_H + pad;
  }

  if (!net.client.connected) {
    login_message = 'Establishing connection...';
  } else if (net.subs.logging_in) {
    login_message = 'Logging in...';
  } else if (net.subs.logging_out) {
    login_message = 'Logging out...';
  } else if (!net.subs.loggedIn() && window.FBInstant) {
    net.subs.loginFacebook(function (err) {
      if (err) {
        ui.modalDialog({
          title: 'Facebook login Failed',
          text: err,
          buttons: {
            'Cancel': null,
          },
        });
      }
    });
  } else if (!net.subs.loggedIn() && net.subs.auto_create_user &&
    !local_storage.get('did_auto_anon') && !local_storage.get('name')
  ) {
    login_message = 'Auto logging in...';
    local_storage.set('did_auto_anon', 'yes');
    let name = `anon${String(Math.random()).slice(2, 8)}`;
    let pass = 'test';
    local_storage.set('name', name);
    net.subs.login(name, pass, function (err) {
      if (err) {
        ui.modalDialog({
          title: 'Auto-login Failed',
          text: err,
          buttons: {
            'Retry': function () {
              local_storage.set('did_auto_anon', undefined);
              local_storage.set('name', undefined);
            },
            'Cancel': null,
          },
        });
      } else {
        net.subs.sendCmdParse('rename_random', (err) => {
          if (err) {
            console.log(err);
          }
        });
      }
    });
  } else if (!net.subs.loggedIn()) {
    let submit = false;
    let w = text_w / 2;
    let indent = center ? 0 : 140;
    let text_x = center ? x - 8 : x;
    ui.font.drawSizedAligned(style, text_x, y, Z.UI, font_height, calign, indent - pad, 0, 'Username:');
    submit = edit_box_name.run({ x: x + indent, y, w, font_height }) === edit_box_name.SUBMIT || submit;
    y += BOX_H + pad;
    ui.font.drawSizedAligned(style, text_x, y, Z.UI, font_height, calign, indent - pad, 0, 'Password:');
    submit = edit_box_password.run({ x: x + indent, y, w, font_height }) === edit_box_password.SUBMIT || submit;
    y += BOX_H + pad;

    if (this.creation_mode) {
      ui.font.drawSizedAligned(style, text_x, y, Z.UI, font_height, calign, indent - pad, 0, 'Confirm Password:');
      submit = edit_box_password_confirm.run({ x: x + indent, y, w, font_height }) === edit_box_password.SUBMIT ||
        submit;
      y += BOX_H + pad;

      ui.font.drawSizedAligned(style, text_x, y, Z.UI, font_height, calign, indent - pad, 0, 'Email Address:');
      submit = edit_box_email.run({ x: x + indent, y, w, font_height }) === edit_box_password.SUBMIT || submit;
      y += BOX_H + pad;

      ui.font.drawSizedAligned(style, text_x, y, Z.UI, font_height, calign, indent - pad, 0, 'Display Name:');
      submit = edit_box_display_name.run({ x: x + indent, y, w, font_height }) === edit_box_password.SUBMIT ||
        submit;

      if (ui.buttonText({
        x: x + w + (center ? 0 : 140) + pad, y, w: button_width * 0.5, h: BOX_H + pad - 4,
        font_height: font_height * 0.75,
        text: 'Random',
      })) {
        net.client.send('random_name', null, function (ignored, data) {
          if (data) {
            edit_box_display_name.setText(data);
          }
        });
      }

      y += BOX_H + pad;

      showTOS(true);

      submit = ui.buttonText({
        x, y, w: button_width, h: button_height,
        font_height,
        text: 'Create User',
      }) || submit;
      if (ui.buttonText({
        x: x + button_width + pad, y, w: button_width, h: button_height,
        font_height,
        text: 'Cancel',
      }) || keyDownEdge(KEYS.ESC)) {
        this.creation_mode = false;
      }
      y += button_height + pad;

      if (submit) {
        local_storage.set('name', edit_box_name.text);
        // do creation and log in!
        net.subs.userCreate({
          user_id: edit_box_name.text,
          email: edit_box_email.text,
          password: edit_box_password.text,
          password_confirm: edit_box_password_confirm.text,
          display_name: edit_box_display_name.text,
        }, (err) => {
          if (err) {
            ui.modalDialog({
              title: 'Login Error',
              text: err,
              buttons: {
                'OK': null,
              },
            });
          } else {
            this.creation_mode = false;
            edit_box_password_confirm.setText('');
            edit_box_email.setText('');
            edit_box_display_name.setText('');
          }
        });
      }

    } else {

      showTOS(false);

      submit = ui.buttonText({
        x: x, y, w: button_width, h: button_height,
        font_height,
        text: 'Log in',
      }) || submit;
      if (center) {
        y += button_height + pad;
      }
      if (ui.buttonText({
        x: center ? x : x + button_width + pad, y, w: button_width, h: button_height,
        font_height,
        text: 'New User',
      })) {
        this.creation_mode = true;
        edit_box_display_name.setText(edit_box_name.text);
        if (edit_box_name.text && edit_box_password.text) {
          edit_box_password_confirm.initial_focus = true;
        } else {
          edit_box_password_confirm.initial_focus = false;
          edit_box_name.focus();
        }
      }
      y += button_height + pad;

      if (submit) {
        local_storage.set('name', edit_box_name.text);
        // do log in!
        net.subs.login(edit_box_name.text, edit_box_password.text, (err) => {
          if (err) {
            ui.modalDialog({
              title: 'Login Error',
              text: err,
              buttons: {
                'OK': null,
              },
            });
          }
        });
      }
    }
  } else {
    // FB Users can't logout
    let show_logout = !window.FBInstant;
    let user_id = net.subs.loggedIn();
    let user_channel = net.subs.getChannel(`user.${user_id}`);
    let display_name = user_channel.getChannelData('public.display_name') || user_id;
    let name = formatUserID(user_id, display_name);

    if (show_logout) {
      let logged_in_font_height = font_height * 0.75;
      if (center) {
        ui.font.drawSizedAligned(style, center ? x - text_w / 2 : x + button_width + 8, y,
          Z.UI, logged_in_font_height,
          (center ? glov_font.ALIGN.HCENTER : calign) | glov_font.ALIGN.HFIT,
          text_w, button_height,
          `Logged in as: ${name}`);
        y += logged_in_font_height + 8;
      } else {
        ui.font.drawSizedAligned(style, x + button_width + 8,
          y + logged_in_font_height * -0.25,
          Z.UI, logged_in_font_height, calign | glov_font.ALIGN.VCENTER | glov_font.ALIGN.HFIT, text_w, button_height,
          'Logged in as:');
        ui.font.drawSizedAligned(style, x + button_width + 8,
          y + logged_in_font_height * 0.75,
          Z.UI, logged_in_font_height, calign | glov_font.ALIGN.VCENTER | glov_font.ALIGN.HFIT, text_w, button_height,
          name);
      }

      if (ui.buttonText({
        x: center ? x - button_width / 2 : x,
        y, w: button_width, h: button_height,
        font_height,
        text: 'Log out',
      })) {
        edit_box_password.setText('');
        if (prelogout) {
          prelogout();
        }
        net.subs.logout();
      }
      y += button_height + 8;
    } else {
      ui.font.drawSizedAligned(style, center ? x - text_w / 2 : x + button_width + 8, y,
        Z.UI, font_height,
        (center ? glov_font.ALIGN.HCENTER : calign) | glov_font.ALIGN.VCENTER | glov_font.ALIGN.HFIT,
        text_w, button_height,
        `Logged in as: ${name}`);
    }
  }
  if (login_message) {
    let w = ui.font.drawSizedAligned(style, center ? x - 400 : x, y, Z.UI, font_height * 1.5,
      glov_font.ALIGN.HVCENTERFIT,
      center ? 800 : 400, min_h, login_message);
    w += 100;
    ui.drawRect(x - (center ? w / 2 : 50), y, x + (center ? w / 2 : w - 50), y + min_h, Z.UI - 0.5, vec4(0,0,0,0.25));
    y += min_h;
  }
  return y;
};

export function create() {
  return new AccountUI();
}
