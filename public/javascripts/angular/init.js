// Include app dependency on ngMaterial
angular.module('app')
  .controller("MainCtrl", function ($scope, $mdToast, $http) {

    // $scope.submit = function () {
    //   console.log($scope.user);
    //   $http.post('order/user123', $scope.user)
    //     .success(function (res) {
    //       console.log(res);
    //       $scope.showSimpleToast('提交成功: ' + JSON.stringify(res));
    //     }).error(function (err) {
    //       console.error(err);
    //     });
    // };

    $scope.submit = function () {
      wx.chooseImage({
        count: 1, // 默认9
        sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
        sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
        success: function (res) {
            var localIds = res.localIds; // 返回选定照片的本地ID列表，localId可以作为img标签的src属性显示图片
        }
      });
    };

    $scope.showSimpleToast = function (msg) {
      $mdToast.show(
        $mdToast.simple()
          .textContent(msg)
          .position('top right')
          .hideDelay(3000)
      );
    };
  });