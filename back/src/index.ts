import * as dotenv from "dotenv";
dotenv.config();
import fastify, { FastifyReply, FastifyRequest } from "fastify";
import path from "path";
import fs from "fs";
import pino from "pino";
import { FastifyRedis } from "@fastify/redis";
import MongoDb, { MongoDbType } from "./plugins/Mongo";
import cors from "@fastify/cors";
import type { FastifyCookieOptions } from "@fastify/cookie";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import ws from "fastify-socket.io";

if (!process.env.MONGO_URI) {
  console.log("MONGO_URI must be defined");
  process.exit(1);
}

interface IQuerystring {
  username: string;
  password: string;
}

interface IHeaders {
  "h-Custom": string;
}

const serverOpts =
  process.env.NODE_ENV === "production"
    ? {
        http2: true,
        https: {
          allowHTTP1: true,
          key: fs.readFileSync(path.join(__dirname, "pem/", "key.pem")),
          cert: fs.readFileSync(path.join(__dirname, "pem/", "cert.pem")),
        },
      }
    : {
        logger: pino({
          level: "info",
        }),
      };

const server = fastify(serverOpts);

server.register(cors, {
  origin: "*",
  preflightContinue: true,
  credentials: true,
});

server.register(cookie, {
  // secret: "my-secret", // for cookies signature
  // parseOptions: {
  // }     // options for parsing cookies
} as FastifyCookieOptions);

server.register(helmet, {
  global: true,
});

server.register(rateLimit, {
  max: 10000,
  timeWindow: "1 minute",
});
server.setErrorHandler(function (error, request, reply) {
  if (reply.statusCode === 429) {
    error.message = "You hit the rate limit! Slow down please!";
  }
  reply.send(error);
});

server.register(require("@fastify/redis"), {
  host: process.env.REDIS_URI,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASS,
});

server.register(ws, {
  cors: {
    origin: "*",
  },
});

server.register(require("./routes/v1/game"), { prefix: "/v1" });

server.get<{
  Querystring: {
    key: string;
  };
}>("/foo", function (req, reply) {
  const { redis } = server;
  redis.get(req.query.key, (err, val) => {
    reply.send(err || val);
  });
});

server.post<{
  Body: {
    key: string;
    value: string;
  };
}>("/foo", function (req, reply) {
  const { redis } = server;
  redis.set(req.body.key, req.body.value, (err) => {
    reply.send(err || { status: "ok" });
  });
});

server.register(MongoDb, { uri: process.env.MONGO_URI! });

server.get<{
  Params: {
    id: string;
  };
}>("/user/:id", async function (req, reply) {
  return await this.mongo.models.User.findOne({
    _id: req.params.id,
  })
    .exec()
    .then((user) => {
      return reply.status(200).send(user);
    })
    .catch((err) => {
      return reply.status(500).send(err);
    });
});

server.decorateRequest("someProp", "hello!");
declare module "fastify" {
  interface FastifyInstance {
    redis: FastifyRedis;
    mongo: MongoDbType;
  }
  interface FastifyRequest {
    // you must reference the interface and not the type
    someProp: string;
  }
}
server.get("/", async (request, reply) => {
  const { someProp } = request; // need to use declaration merging to add this prop to the request interface
  return someProp;
});

type CustomRequest = FastifyRequest<{
  Body: { test: boolean };
}>;
server.get(
  "/typedRequest",
  async (request: CustomRequest, reply: FastifyReply) => {
    return request.body.test;
  }
);

server.get("/ping", async (request, reply) => {
  server.log.info("log message");
  return "pong\n";
});

server.get<{
  Querystring: IQuerystring;
  Headers: IHeaders;
}>(
  "/auth",
  {
    preValidation: (request, reply, done) => {
      const { username, password } = request.query;
      done(username !== "admin" ? new Error("Must be admin") : undefined); // only validate `admin` account
    },
  },
  async (request, reply) => {
    const { username, password } = request.query;
    const { "h-Custom": hCustom } = request.headers;

    console.log(hCustom, username);

    return "Logged";
  }
);

server.get("/teste", async (request, reply) => {
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(process.env.SENDGRID_KEY);
  const msg = {
    to: "henrique.mrcr@gmail.com",
    from: process.env.SENDGRID_VALID_EMAIL,
    subject: "Sending with Twilio SendGrid is Fun",
    text: "and easy to do anywhere, even with Node.js",
    html: `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns=http://www.w3.org/1999/xhtml xmlns:v=urn:schemas-microsoft-com:vml xmlns:o=urn:schemas-microsoft-com:office:office lang="en">
    <head>
    <meta name=x-apple-disable-message-reformatting>
    <meta http-equiv=X-UA-Compatible>
    <meta charset=utf-8>
    <meta name=viewport content=target-densitydpi=device-dpi>
    <meta content=true name=HandheldFriendly>
    <meta content=width=device-width name=viewport>
    <style type="text/css">
    table {
    border-collapse: separate;
    table-layout: fixed;
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt
    }
    table td {
    border-collapse: collapse
    }
    .ExternalClass {
    width: 100%
    }
    .ExternalClass,
    .ExternalClass p,
    .ExternalClass span,
    .ExternalClass font,
    .ExternalClass td,
    .ExternalClass div {
    line-height: 100%
    }
    * {
    line-height: inherit;
    text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
    -moz-text-size-adjust: 100%;
    -o-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale
    }
    html {
    -webkit-text-size-adjust: none !important
    }
    img+div {
    display: none;
    display: none !important
    }
    img {
    Margin: 0;
    padding: 0;
    -ms-interpolation-mode: bicubic
    }
    h1, h2, h3, p, a {
    font-family: inherit;
    font-weight: inherit;
    font-size: inherit;
    line-height: 1;
    color: inherit;
    background: none;
    overflow-wrap: normal;
    white-space: normal;
    word-break: break-word
    }
    a {
    color: inherit;
    text-decoration: none
    }
    h1, h2, h3, p {
    min-width: 100%!important;
    width: 100%!important;
    max-width: 100%!important;
    display: inline-block!important;
    border: 0;
    padding: 0;
    margin: 0
    }
    a[x-apple-data-detectors] {
    color: inherit !important;
    text-decoration: none !important;
    font-size: inherit !important;
    font-family: inherit !important;
    font-weight: inherit !important;
    line-height: inherit !important
    }
    a[href^="mailto"],
    a[href^="tel"],
    a[href^="sms"] {
    color: inherit !important;
    text-decoration: none !important
    }
    @media only screen and (min-width: 481px) {
    .hd { display: none!important }
    }
    @media only screen and (max-width: 480px) {
    .hm { display: none!important }
    }
    [style*="Open Sans"] {font-family: 'Open Sans', BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif !important;} [style*="Fira Sans"] {font-family: 'Fira Sans', BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif !important;} [style*="Montserrat"] {font-family: 'Montserrat', BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif !important;}
    @media only screen and (min-width: 481px) {.t11,.t9{padding-bottom:100px!important}.t22{mso-line-height-alt:90px!important;line-height:90px!important}.t24{width:50px!important}.t32{mso-line-height-alt:40px!important;line-height:40px!important}.t34{padding-bottom:40px!important;border-top-left-radius:inherit!important;border-top-right-radius:inherit!important}.t39{border-top-left-radius:inherit!important;border-top-right-radius:inherit!important;padding-bottom:40px!important}.t40{line-height:52px!important;font-size:45px!important;mso-text-raise:2px!important}.t42{mso-line-height-alt:28px!important;line-height:28px!important}.t50{line-height:28px!important;font-size:18px!important}.t52{mso-line-height-alt:50px!important;line-height:50px!important}.t60{line-height:28px!important;font-size:18px!important}.t64,.t69{line-height:48px!important;mso-text-raise:11px!important}.t70{line-height:48px!important;font-size:13px!important;mso-text-raise:11px!important}.t72{line-height:48px!important;mso-text-raise:11px!important}.t79,.t81{padding-top:80px!important;padding-bottom:80px!important}.t92{mso-line-height-alt:40px!important;line-height:40px!important}.t94{padding-bottom:60px!important;border-top-left-radius:inherit!important;border-top-right-radius:inherit!important}.t99{border-top-left-radius:inherit!important;border-top-right-radius:inherit!important;padding-bottom:60px!important}}
    </style>
    <!--[if !mso]><!-->
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@700&family=Fira+Sans:wght@400;600&family=Montserrat:wght@800&display=swap" rel="stylesheet" type="text/css">
    <!--<![endif]-->
    <!--[if mso]>
    <style type="text/css">
    .t11,.t9{padding-bottom:100px !important}.t22{mso-line-height-alt:90px !important;line-height:90px !important}.t24{width:50px !important}.t32{mso-line-height-alt:40px !important;line-height:40px !important}.t34{padding-bottom:40px !important;border-top-left-radius:inherit !important;border-top-right-radius:inherit !important}.t39{border-top-left-radius:inherit !important;border-top-right-radius:inherit !important;padding-bottom:40px !important}.t40{line-height:52px !important;font-size:45px !important;mso-text-raise:2px !important}.t42{mso-line-height-alt:28px !important;line-height:28px !important}.t50{line-height:28px !important;font-size:18px !important}.t52{mso-line-height-alt:50px !important;line-height:50px !important}.t60{line-height:28px !important;font-size:18px !important}.t64,.t69{line-height:48px !important;mso-text-raise:11px !important}.t70{line-height:48px !important;font-size:13px !important;mso-text-raise:11px !important}.t72{line-height:48px !important;mso-text-raise:11px !important}.t79,.t81{padding-top:80px !important;padding-bottom:80px !important}.t92{mso-line-height-alt:40px !important;line-height:40px !important}.t94{padding-bottom:60px !important;border-top-left-radius:inherit !important;border-top-right-radius:inherit !important}.t99{border-top-left-radius:inherit !important;border-top-right-radius:inherit !important;padding-bottom:60px !important}
    </style>
    <![endif]-->
    <!--[if mso]>
    <xml>
    <o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    </head>
    <body class=t0 style="min-width:100%;Margin:0px;padding:0px;background-color:#F7F9FC;"><div class=t1 style="background-color:#F7F9FC;"><table role=presentation width=100% cellpadding=0 cellspacing=0 border=0 align=center><tr><td class=t121 style="font-size:0;line-height:0;mso-line-height-rule:exactly;" valign=top align=center>
    <!--[if mso]>
    <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false">
    <v:fill color=#F7F9FC />
    </v:background>
    <![endif]-->
    <table role=presentation width=100% cellpadding=0 cellspacing=0 border=0 align=center><tr><td>
    <table class=t10 role=presentation cellpadding=0 cellspacing=0 align=center><tr>
    <!--[if !mso]><!--><td class=t11 style="background-color:#FFFFFF;width:620px;padding:60px 30px 70px 30px;">
    <!--<![endif]-->
    <!--[if mso]><td style="background-color:#FFFFFF;width:680px;padding:60px 30px 70px 30px;"><![endif]-->
    <table role=presentation width=100% cellpadding=0 cellspacing=0><tr><td>
    <table class=t19 role=presentation cellpadding=0 cellspacing=0 align=center><tr><td class=t20 style="background-color:unset;width:475px;"><table role=presentation width=100% cellpadding=0 cellspacing=0><tr><td>
    <table class=t23 role=presentation cellpadding=0 cellspacing=0 align=center><tr><td class=t24 style="width:40px;"><div style="font-size:0px;"><img class=t30 style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width=50 src=https://logodownload.org/wp-content/uploads/2014/09/google-logo-1.png /></div></td>
    </tr></table>
    </td></tr><tr><td><div class=t22 style="mso-line-height-rule:exactly;mso-line-height-alt:50px;line-height:50px;font-size:1px;display:block;">&nbsp;</div></td></tr><tr><td>
    <table class=t33 role=presentation cellpadding=0 cellspacing=0 align=center><tr><td class=t34 style="width:475px;padding:0 0 30px 0;"><h1 class=t40 style="text-decoration:none;text-transform:none;direction:ltr;color:#000000;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;font:normal 700 28px/38px BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif, 'Open Sans';">Reset your password</h1></td>
    </tr></table>
    </td></tr><tr><td><div class=t32 style="mso-line-height-rule:exactly;mso-line-height-alt:30px;line-height:30px;font-size:1px;display:block;">&nbsp;</div></td></tr><tr><td>
    <table class=t43 role=presentation cellpadding=0 cellspacing=0 align=center><tr><td class=t44 style="width:475px;"><p class=t50 style="text-decoration:none;text-transform:none;direction:ltr;color:#9095A2;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;font:normal 400 16px/26px BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif, 'Fira Sans';">You&#39;re receiving this e-mail because you requested a password reset for your Flash account.</p></td>
    </tr></table>
    </td></tr><tr><td><div class=t42 style="mso-line-height-rule:exactly;mso-line-height-alt:18px;line-height:18px;font-size:1px;display:block;">&nbsp;</div></td></tr><tr><td>
    <table class=t53 role=presentation cellpadding=0 cellspacing=0 align=center><tr><td class=t54 style="width:475px;"><p class=t60 style="text-decoration:none;text-transform:none;direction:ltr;color:#9095A2;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;font:normal 400 16px/26px BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif, 'Fira Sans';">Please tap the button below to choose a new password.</p></td>
    </tr></table>
    </td></tr><tr><td><div class=t52 style="mso-line-height-rule:exactly;mso-line-height-alt:30px;line-height:30px;font-size:1px;display:block;">&nbsp;</div></td></tr><tr><td>
    <table class=t63 role=presentation cellpadding=0 cellspacing=0 align=center><tr><td class=t64 style="background-color:#35B7D4;width:246px;text-align:center;line-height:46px;mso-line-height-rule:exactly;mso-text-raise:10px;"><a class=t70 href=https://tabular.email style="display:block;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;direction:ltr;color:#FFFFFF;text-align:center;mso-line-height-rule:exactly;mso-text-raise:10px;font:normal 800 12px/46px BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif, 'Montserrat';" target=_blank>Reset your password</a></td>
    </tr></table>
    </td></tr></table></td>
    </tr></table>
    </td></tr></table></td>
    </tr></table>
    </td></tr><tr><td>
    <table class=t80 role=presentation cellpadding=0 cellspacing=0 align=center><tr>
    <!--[if !mso]><!--><td class=t81 style="background-color:#000000;width:620px;padding:60px 30px 60px 30px;">
    <!--<![endif]-->
    <!--[if mso]><td style="background-color:#000000;width:680px;padding:60px 30px 60px 30px;"><![endif]-->
    <table role=presentation width=100% cellpadding=0 cellspacing=0><tr><td>
    <table class=t89 role=presentation cellpadding=0 cellspacing=0 align=center><tr><td class=t90 style="background-color:unset;width:475px;"><table role=presentation width=100% cellpadding=0 cellspacing=0><tr><td>
    <table class=t93 role=presentation cellpadding=0 cellspacing=0 align=center><tr><td class=t94 style="border-bottom:1px solid #262626;width:600px;padding:0 0 40px 0;"><h1 class=t100 style="text-decoration:none;text-transform:none;direction:ltr;color:#FFFFFF;text-align:center;mso-line-height-rule:exactly;font:normal 600 32px/32px BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif, 'Fira Sans';">Flash Inc.</h1></td>
    </tr></table>
    </td></tr><tr><td><div class=t92 style="mso-line-height-rule:exactly;mso-line-height-alt:30px;line-height:30px;font-size:1px;display:block;">&nbsp;</div></td></tr><tr><td>
    <table class=t103 role=presentation cellpadding=0 cellspacing=0 align=center><tr><td class=t104 style="width:600px;"><p class=t110 style="text-decoration:none;text-transform:none;direction:ltr;color:#9095A2;text-align:center;mso-line-height-rule:exactly;mso-text-raise:2px;font:normal 400 14px/22px BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif, 'Fira Sans';">If you do not want to change your password or didn&#39;t request a reset, you can ignore and delete this email.</p></td>
    </tr></table>
    </td></tr><tr><td><div class=t102 style="mso-line-height-rule:exactly;mso-line-height-alt:20px;line-height:20px;font-size:1px;display:block;">&nbsp;</div></td></tr><tr><td>
    <table class=t113 role=presentation cellpadding=0 cellspacing=0 align=center><tr><td class=t114 style="width:600px;"><p class=t120 style="text-decoration:none;text-transform:none;direction:ltr;color:#9095A2;text-align:center;mso-line-height-rule:exactly;mso-text-raise:2px;font:normal 400 14px/22px BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif, 'Fira Sans';">Flash Inc. All rights reserved</p></td>
    </tr></table>
    </td></tr></table></td>
    </tr></table>
    </td></tr></table></td>
    </tr></table>
    </td></tr></table></td></tr></table></div></body>
    </html>
    `,
  };

  try {
    await sgMail.send(msg);

    return reply.status(200).send("Email sent");
  } catch (error: any) {
    console.error(error);

    if (error.response) {
      console.error(error.response.body);
    }

    return reply.status(401).send("Email not sent");
  }
});

server.listen({ port: 3001 }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  server.log.info(`Server listening at ${address}`);
});
