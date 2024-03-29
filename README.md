# checkout-api

## Auth0 environment variables
This solution requires the following env variables for integration with Auth0:
  - AUTH0_DOMAIN
  - AUTHO_CLIENT_ID
  - AUTH0_CLIENT_SECRET

Also requires
  - RECEIPTFUL_API_KEY

Since these are senstive they are not included in the docker-compose.yml.
The docker file will source `.env` file if it is present in the project directory, this can be used for local development.

For sending email / sms confirmation, the following are needed:
  - TWILIO_ACCOUNT_SID
  - TWILIO_AUTH_TOKEN
  - TWILIO_NUMBER
  - SENDGRID_API_USER
  - SENDGRID_API_KEY

## Updating Datastore indexes

To update the indexes in Google Cloud Datastore, using the auto-generated indexes from the dev gcd tool, run the following script from the gcd container:

```
cd gcd-v1beta2-rev1-3.0.2
./gcd.sh updateindexes --auth_mode=oauth2 --dataset_id_override=[gcloud-project-id] /opt/gcd/data/
```

https://cloud.google.com/datastore/docs/tools/indexconfig
