$(function () {
  $('#submit').on('click', function () {
    var username = $('#inputAccount').val();
    var password = $('#inputPassword').val();
    if (username.length == 0) {
      return alert('账号不能为空');
    }
    if (password.length == 0) {
      return alert('密码不能为空');
    }
  })
});