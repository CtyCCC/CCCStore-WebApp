/*[Login FB]
=======================================================*/
window.fbAsyncInit = function() {
		FB.init({
		appId      : '495449644277627',
		cookie     : true,
		xfbml      : true,
		version    : 'v3.2'
	});

    FB.getLoginStatus(function(response) {
        statusChangeCallback(response);
    });
    FB.logout(function(response) {
        // user is now logged out
    });

};

(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = 'https://connect.facebook.net/vi_VN/sdk.js#xfbml=1&version=v3.2&appId=322620955226186&autoLogAppEvents=1';
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

/// login thanh công lấy dữ liệu gì lấy từ response
function statusChangeCallback(response){
}
/*[******]
=======================================================*/
