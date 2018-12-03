$(document).ready(function(e) {

    jQuery.validator.addMethod("user", function(value, element) {
        return this.optional(element) || /^[A-Za-z0-9_\.]{8,32}$/g.test(value);
    }, "User chưa hợp lệ (Chỉ bao gồm a-Z 0-9 _ . và từ 8-32 ký tự)");

    $("#kt").validate({
        rules:{
            txtuser:{
                required:true,
                user: true,
            },
            txtpass:{
                required: true,
                minlength: 8,
                maxlength: 32,
            },
            txtrepass:{
                required:true,
                equalTo: "#pass",
            },
            txtten:{
                required:true
            },
            txtsdt:{
                required: true,
                number: true,
                digits: true,
                maxlength: 10,
                minlength: 10,
            },
            txtmail:{
                required: true,
                email: true,
            },
        },
        messages:{
        }
    });
});