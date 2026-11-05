package nats

import (
	"context"
	"go.uber.org/fx"
)

// Module provides the NATSService to the fx container
var Module = fx.Module(
	"natsservice",
	fx.Provide(NewNATSService),
	fx.Invoke(registerLifecycle),
)

// registerLifecycle ensures the NATS connection and AuthService are properly closed when the app shuts down
func registerLifecycle(lc fx.Lifecycle, ns *NATSService) {
	if ns == nil {
		return
	}

	lc.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			ns.Close()
			return nil
		},
		//OnStart: func(ctx context.Context) error {
		//	// Optionally perform startup logic for AuthService
		//	// e.g., checking if the issuer key is valid
		//	if as.issuerKeyPair == nil {
		//		return errors.New("invalid issuer key pair for AuthService")
		//	}
		//	return nil
		//},
	})
}
